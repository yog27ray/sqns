import { expect } from 'chai';
import nock from 'nock';
import { ResponseItem } from '../../../../typings/response-item';
import { ARN, CreateTopicResponse, KeyValue } from '../../../../typings/typings';
import { delay, dropDatabase } from '../../../setup';
import { deleteDynamicDataOfResults, Env } from '../../../test-env';
import { SYSTEM_QUEUE_NAME } from '../../common/helper/common';
import { RequestClient } from '../../common/request-client/request-client';
import { SQNSClient } from '../../s-q-n-s-client';
import { WorkerEventScheduler } from './worker-event-scheduler';
import { WorkerQueueConfig } from './worker-queue-config';

describe('WorkerEventSchedulerSpec', () => {
  context('installing a Worker scheduler', () => {
    let workerEventScheduler: WorkerEventScheduler;

    beforeEach(async () => {
      await dropDatabase();
      const client = new SQNSClient({
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
      });
      const queue = await client.createQueue({ QueueName: 'queue1' });
      await client.sendMessageBatch({
        QueueUrl: queue.QueueUrl,
        Entries: [{ Id: '123', MessageBody: 'type1' }, { Id: '1234', MessageBody: 'type2' }],
      });
    });

    it('should add job events in the queue', async () => {
      const result: Array<ResponseItem> = [];
      await new Promise((resolve: (value?: unknown) => void) => {
        let itemCheck = 2;
        const workerQueueConfig = new WorkerQueueConfig('queue1', async (queueName: string, item: ResponseItem) => {
          result.push(item);
          itemCheck -= 1;
          if (!itemCheck) {
            resolve();
          }
          return 'response';
        });
        workerEventScheduler = new WorkerEventScheduler(
          {
            endpoint: `${Env.URL}/api`,
            accessKeyId: Env.accessKeyId,
            secretAccessKey: Env.secretAccessKey,
          },
          [workerQueueConfig],
          '*/2 * * * * *');
      });
      const stats = await new RequestClient().get(`${Env.URL}/api/queues/events/stats`, true);
      expect(stats).to.deep.equal({
        PRIORITY_TOTAL: 0,
        PRIORITY_999999: 0,
        'arn:sqns:sqs:sqns:1:queue1': { PRIORITY_TOTAL: 0, PRIORITY_999999: 0 },
      });
      deleteDynamicDataOfResults({ Messages: result });
      expect(result).to.deep.equal([
        { MD5OfBody: '3156e42ab24604b8de92a93ed761532d', Body: 'type1' },
        { MD5OfBody: '8fe8b170aa076a4233d8eda7d28804d4', Body: 'type2' },
      ]);
    });

    afterEach(async () => {
      workerEventScheduler.cancel();
    });
  });

  context('processing multiple events', () => {
    let workerEventScheduler: WorkerEventScheduler;
    const ITEM_COUNT = 100;

    beforeEach(async () => {
      await dropDatabase();
      const client = new SQNSClient({
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
      });
      const queue = await client.createQueue({ QueueName: 'queue1' });
      await client.sendMessageBatch({
        QueueUrl: queue.QueueUrl,
        Entries: new Array(ITEM_COUNT).fill(0).map((v: number, id: number) => ({ Id: `${id}`, MessageBody: 'type1' })),
      });
      await delay();
    });

    it('should process 100 events in the queue', async () => {
      await new Promise((resolve: (value?: unknown) => void) => {
        let itemCheck = ITEM_COUNT;
        // eslint-disable-next-line promise/param-names
        const workerQueueConfig = new WorkerQueueConfig('queue1', () => new Promise((resolve1
          : (value?: string) => void) => setTimeout(() => {
          resolve1();
          itemCheck -= 1;
          if (!itemCheck) {
            resolve();
          }
        }, 10)));
        workerEventScheduler = new WorkerEventScheduler(
          {
            endpoint: `${Env.URL}/api`,
            accessKeyId: Env.accessKeyId,
            secretAccessKey: Env.secretAccessKey,
          },
          [workerQueueConfig],
          '*/2 * * * * *');
      });
      await delay();
      const stats = await new RequestClient().get(`${Env.URL}/api/queues/events/stats`, true);
      expect(stats).to.deep.equal({
        PRIORITY_TOTAL: 0,
        PRIORITY_999999: 0,
        'arn:sqns:sqs:sqns:1:queue1': { PRIORITY_TOTAL: 0, PRIORITY_999999: 0 },
      });
    });

    afterEach(async () => {
      workerEventScheduler.cancel();
    });
  });

  context('error handling of slave scheduler', () => {
    let workerEventScheduler: WorkerEventScheduler;

    beforeEach(async () => {
      await dropDatabase();
      const client = new SQNSClient({
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
      });
      const queue = await client.createQueue({ QueueName: 'queue1' });
      await client.sendMessageBatch({
        QueueUrl: queue.QueueUrl,
        Entries: [{ Id: '123', MessageBody: 'type1' }, { Id: '1234', MessageBody: 'type2' }],
      });
      await delay();
    });

    it('should re-attempt to check if server is ready.', async () => {
      await new Promise((resolve: (value: unknown) => void) => {
        const timeout = setTimeout(resolve, 6000);
        const workerQueueConfig = new WorkerQueueConfig('queue1', async () => {
          clearTimeout(timeout);
          return 'response';
        });
        workerEventScheduler = new WorkerEventScheduler(
          {
            endpoint: `${Env.URL}/api/wrong`,
            accessKeyId: Env.accessKeyId,
            secretAccessKey: Env.secretAccessKey,
          },
          [workerQueueConfig],
          '*/2 * * * * *');
      });
      const stats = await new RequestClient().get(`${Env.URL}/api/queues/events/stats`, true);
      expect(stats).to.deep.equal({
        PRIORITY_TOTAL: 2,
        'arn:sqns:sqs:sqns:1:queue1': { PRIORITY_TOTAL: 2, PRIORITY_999999: 2 },
        PRIORITY_999999: 2,
      });
    });

    it('should call failure api when request fails.', async () => {
      await new Promise((resolve: (value: unknown) => void) => {
        let count = 0;
        const workerQueueConfig = new WorkerQueueConfig('queue1', () => {
          count += 1;
          if (count === 2) {
            setTimeout(resolve, 0);
            return Promise.resolve('this is success message');
          }
          return Promise.reject('Error in processing');
        });
        workerEventScheduler = new WorkerEventScheduler(
          {
            endpoint: `${Env.URL}/api`,
            accessKeyId: Env.accessKeyId,
            secretAccessKey: Env.secretAccessKey,
          },
          [workerQueueConfig],
          '*/2 * * * * *');
      });
      const stats = await new RequestClient().get(`${Env.URL}/api/queues/events/stats`, true);
      expect(stats).to.deep.equal({
        PRIORITY_TOTAL: 0,
        'arn:sqns:sqs:sqns:1:queue1': { PRIORITY_TOTAL: 0, PRIORITY_999999: 0 },
        PRIORITY_999999: 0,
      });
    });

    afterEach(async () => {
      workerEventScheduler.cancel();
    });
  });

  context('processing of sns scheduler', () => {
    let workerEventScheduler: WorkerEventScheduler;
    let interval: NodeJS.Timeout;
    let client: SQNSClient;
    let PublishId: string;
    let SubscriptionArn: ARN;
    let topic: CreateTopicResponse;

    beforeEach(async () => {
      await dropDatabase();
      client = new SQNSClient({
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
      });
      topic = await client.createTopic({
        Name: 'Topic1',
        Attributes: {
          DeliveryPolicy: '{"default":{"defaultHealthyRetryPolicy":'
            + '{"numRetries":1,"numNoDelayRetries":2,"minDelayTarget":3,"maxDelayTarget":4,"numMinDelayRetries":5,"numMaxDelayRetries":6,'
            + '"backoffFunction":"linear"},"disableOverrides":false}}',
        },
      });
    });

    it('should update published events as completed when no subscription to topic exists', async () => {
      const { MessageId: PublishId } = await client.publish({
        Message: 'This is message',
        TopicArn: topic.TopicArn,
        PhoneNumber: '9999999999',
        Subject: 'Subject',
        MessageAttributes: { key1: { DataType: 'String', StringValue: 'value' } },
      });
      const workerQueueConfig = new WorkerQueueConfig(SYSTEM_QUEUE_NAME.SNS, undefined);
      workerEventScheduler = new WorkerEventScheduler(
        {
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        },
        [workerQueueConfig],
        '*/2 * * * * *',
      );
      await new Promise((resolve: (value?: unknown) => void) => {
        interval = setInterval(async () => {
          const published = await client.getPublish({ MessageId: PublishId });
          if (published.Status === 'Published') {
            resolve();
            clearInterval(interval);
            interval = undefined;
          }
        }, 100);
      });
    });

    it('should update published events as completed when subscriptions to topic exists', async () => {
      let callReceivedResolver: (value?: unknown) => void;
      nock('http://test.sns.subscription')
        .persist()
        .post('/valid', () => true)
        // eslint-disable-next-line func-names
        .reply(200, async function (path: string, body: KeyValue): Promise<unknown> {
          if (body.SubscribeURL) {
            await new RequestClient().get(body.SubscribeURL as string);
            return {};
          }
          expect(body.Type).to.equal('Notification');
          expect(body.MessageId).to.equal(PublishId);
          expect(body.TopicArn).to.equal('arn:sqns:sns:sqns:1:Topic1');
          expect(body.Subject).to.equal('Subject');
          expect(body.Message).to.equal('This is message');
          expect(body.SubscriptionArn).to.equal(SubscriptionArn);
          expect(body.UnsubscribeURL).to.equal(`http://127.0.0.1:1234/api/sns?Action=Unsubscribe&SubscriptionArn=${SubscriptionArn}`);
          expect(body.MessageAttributes).to.deep.equal({ key1: { DataType: 'String', StringValue: 'value' } });
          expect(this.req.headers['x-sqns-sns-message-id'][0]).to.equal(body.MessageId);
          expect(this.req.headers['x-sqns-sns-message-type'][0]).to.equal('Notification');
          expect(this.req.headers['x-sqns-sns-topic-arn'][0]).to.equal(body.TopicArn);
          expect(this.req.headers['x-sqns-sns-subscription-arn'][0]).to.equal(body.SubscriptionArn);
          callReceivedResolver();
          return {};
        });
      ({ SubscriptionArn } = await client.subscribe({
        TopicArn: topic.TopicArn,
        Attributes: { key: 'value', key2: 'value2' },
        Endpoint: 'http://test.sns.subscription/valid',
        Protocol: 'http',
        ReturnSubscriptionArn: true,
      }));
      ({ MessageId: PublishId } = await client.publish({
        Message: 'This is message',
        TopicArn: topic.TopicArn,
        PhoneNumber: '9999999999',
        Subject: 'Subject',
        MessageAttributes: { key1: { DataType: 'String', StringValue: 'value' } },
      }));
      const workerQueueConfig = new WorkerQueueConfig(SYSTEM_QUEUE_NAME.SNS, undefined);
      workerEventScheduler = new WorkerEventScheduler(
        {
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        },
        [workerQueueConfig],
        '*/2 * * * * *',
      );
      // eslint-disable-next-line promise/param-names
      await new Promise((resolver: (value: unknown) => void) => (callReceivedResolver = resolver));
    });

    afterEach(() => {
      if (interval) {
        clearInterval(interval);
      }
      nock.cleanAll();
      workerEventScheduler.cancel();
    });
  });
});
