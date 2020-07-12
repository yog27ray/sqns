import { expect } from 'chai';
import rp from 'request-promise';
import { SimpleQueueServerClient } from '../aws';
import { delay, dropDatabase } from '../../setup';
import { deleteDynamicDataOfResults, deleteQueues, Env } from '../../test-env';
import { WorkerEventScheduler } from './worker-event-scheduler';
import { ResponseItem } from '../request-response-types/response-item';

describe('SlaveEventSchedulerSpec', () => {
  context('installing a slave scheduler', () => {
    let slaveScheduler: WorkerEventScheduler;

    beforeEach(async () => {
      await dropDatabase();
      const client = new SimpleQueueServerClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      await deleteQueues(client);
      const queue = await client.createQueue({ QueueName: 'queue1' });
      await client.sendMessageBatch({
        QueueUrl: queue.QueueUrl,
        Entries: [{ Id: '123', MessageBody: 'type1' }, { Id: '1234', MessageBody: 'type2' }],
      });
    });

    it('should add job events in the queue', async () => {
      const result: Array<ResponseItem> = [];
      await new Promise((resolve: Function) => {
        let itemCheck = 2;
        slaveScheduler = new WorkerEventScheduler(
          {
            region: Env.region,
            endpoint: `${Env.URL}/api`,
            accessKeyId: Env.accessKeyId,
            secretAccessKey: Env.secretAccessKey,
            maxRetries: 0,
          },
          'queue1',
          async (item: ResponseItem) => {
            result.push(item);
            itemCheck -= 1;
            if (!itemCheck) {
              resolve();
            }
            return 'response';
          }, '*/2 * * * * *');
      });
      const stats = await rp({ uri: `${Env.URL}/api/queues/events/stats`, json: true });
      expect(stats).to.deep.equal({
        PRIORITY_TOTAL: 0,
        PRIORITY_999999: 0,
        queue1: { PRIORITY_TOTAL: 0, PRIORITY_999999: 0 },
      });
      deleteDynamicDataOfResults({ Messages: result });
      expect(result).to.deep.equal([
        { MD5OfBody: '3156e42ab24604b8de92a93ed761532d', Body: 'type1' },
        { MD5OfBody: '8fe8b170aa076a4233d8eda7d28804d4', Body: 'type2' },
      ]);
    });

    afterEach(async () => {
      slaveScheduler.cancel();
    });
  });

  context('processing multiple events', () => {
    let slaveScheduler: WorkerEventScheduler;
    const ITEM_COUNT = 100;

    beforeEach(async () => {
      await dropDatabase();
      const client = new SimpleQueueServerClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      await deleteQueues(client);
      const queue = await client.createQueue({ QueueName: 'queue1' });
      await client.sendMessageBatch({
        QueueUrl: queue.QueueUrl,
        Entries: new Array(ITEM_COUNT).fill(0).map((v: number, id: number) => ({ Id: `${id}`, MessageBody: 'type1' })),
      });
      await delay();
    });

    it('should process 100 events in the queue', async () => {
      await new Promise((resolve: Function) => {
        let itemCheck = ITEM_COUNT;
        slaveScheduler = new WorkerEventScheduler(
          {
            region: Env.region,
            endpoint: `${Env.URL}/api`,
            accessKeyId: Env.accessKeyId,
            secretAccessKey: Env.secretAccessKey,
            maxRetries: 0,
          },
          'queue1',
          // eslint-disable-next-line promise/param-names
          () => new Promise((resolve1: Function) => setTimeout(() => {
            resolve1();
            itemCheck -= 1;
            if (!itemCheck) {
              resolve();
            }
          }, 10)),
          '*/2 * * * * *');
      });
      await delay();
      const stats = await rp({ uri: `${Env.URL}/api/queues/events/stats`, json: true });
      expect(stats).to.deep.equal({
        PRIORITY_TOTAL: 0,
        PRIORITY_999999: 0,
        queue1: { PRIORITY_TOTAL: 0, PRIORITY_999999: 0 },
      });
    });

    afterEach(async () => {
      slaveScheduler.cancel();
    });
  });

  context('error handling of slave scheduler', () => {
    let slaveScheduler: WorkerEventScheduler;

    beforeEach(async () => {
      await dropDatabase();
      const client = new SimpleQueueServerClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      await deleteQueues(client);
      const queue = await client.createQueue({ QueueName: 'queue1' });
      await client.sendMessageBatch({
        QueueUrl: queue.QueueUrl,
        Entries: [{ Id: '123', MessageBody: 'type1' }, { Id: '1234', MessageBody: 'type2' }],
      });
      await delay();
    });

    it('should re-attempt to check if server is ready.', async () => {
      await new Promise((resolve: Function) => {
        const timeout = setTimeout(resolve, 6000);
        slaveScheduler = new WorkerEventScheduler(
          {
            region: Env.region,
            endpoint: `${Env.URL}/api/wrong`,
            accessKeyId: Env.accessKeyId,
            secretAccessKey: Env.secretAccessKey,
            maxRetries: 0,
          },
          'queue1',
          async () => {
            clearTimeout(timeout);
            return 'response';
          }, '*/2 * * * * *');
      });
      const stats = await rp({ uri: `${Env.URL}/api/queues/events/stats`, json: true });
      expect(stats).to.deep.equal({
        PRIORITY_TOTAL: 2,
        queue1: { PRIORITY_TOTAL: 2, PRIORITY_999999: 2 },
        PRIORITY_999999: 2,
      });
    });

    it('should call failure api when request fails.', async () => {
      await new Promise((resolve: Function) => {
        let count = 0;
        slaveScheduler = new WorkerEventScheduler(
          {
            region: Env.region,
            endpoint: `${Env.URL}/api`,
            accessKeyId: Env.accessKeyId,
            secretAccessKey: Env.secretAccessKey,
            maxRetries: 0,
          },
          'queue1',
          () => {
            count += 1;
            if (count === 2) {
              setTimeout(resolve, 0);
              return Promise.resolve('this is success message');
            }
            return Promise.reject('Error in processing');
          },
          '*/2 * * * * *');
      });
      const stats = await rp({ uri: `${Env.URL}/api/queues/events/stats`, json: true });
      expect(stats).to.deep.equal({
        PRIORITY_TOTAL: 0,
        queue1: { PRIORITY_TOTAL: 0, PRIORITY_999999: 0 },
        PRIORITY_999999: 0,
      });
    });

    afterEach(async () => {
      slaveScheduler.cancel();
    });
  });
});
