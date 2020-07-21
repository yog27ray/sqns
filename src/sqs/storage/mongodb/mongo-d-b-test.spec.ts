import SQS from 'aws-sdk/clients/sqs';
import { expect } from 'chai';
import moment from 'moment';
import rp from 'request-promise';
import { delay, dropDatabase, mongoConnection } from '../../../setup';
import { Env } from '../../../test-env';
import { SimpleQueueServerClient } from '../../aws';
import { WorkerEventScheduler } from '../../scheduler-worker/worker-event-scheduler';
import { MongoDBAdapter } from './mongo-d-b-adapter';

if (process.env.TEST_DB === 'mongoDB') {
  describe('mongoDB test cases', () => {
    context('SlaveEventSchedulerSpec', () => {
      let slaveScheduler: WorkerEventScheduler;
      let queue: SQS.Types.CreateQueueResult;
      let client: SimpleQueueServerClient;

      beforeEach(async () => {
        await dropDatabase();
        client = new SimpleQueueServerClient({
          region: Env.region,
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
          maxRetries: 0,
        });
        queue = await client.createQueue({ QueueName: 'queue1' });
        const time = new Date().getTime() / -1000;
        await client.sendMessageBatch({
          QueueUrl: queue.QueueUrl,
          Entries: [
            { Id: '123', MessageBody: '123', DelaySeconds: time },
            { Id: '1234', MessageBody: '1234', DelaySeconds: time + 60 },
            { Id: '1235', MessageBody: '1235', DelaySeconds: time + 120 },
          ],
        });
      });

      it('should call failure api when request fails in mongoDB.', async () => {
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
            async () => {
              count += 1;
              if (count === 2) {
                return Promise.resolve('this is success message');
              }
              if (count === 3) {
                setTimeout(resolve, 0);
                return new Promise(() => 0);
              }
              return Promise.reject('Error in processing');
            },
            '*/2 * * * * *');
        });
        await delay();
        const stats = await rp({ uri: `${Env.URL}/api/queues/events/stats`, json: true });
        expect(stats).to.deep.equal({
          PRIORITY_TOTAL: 0,
          queue1: { PRIORITY_TOTAL: 0, PRIORITY_999999: 0 },
          PRIORITY_999999: 0,
        });
        const queueItem = await mongoConnection.findOne('_Queue_Queues', { name: 'queue1' });
        const items = await mongoConnection.find('_Queue_Event', {}, { originalEventTime: 1 });
        expect(moment(items[0].originalEventTime).utc().format('YYYY-MM-DDTHH:mm')).to.equal('1970-01-01T00:00');
        expect(moment(items[1].originalEventTime).utc().format('YYYY-MM-DDTHH:mm')).to.equal('1970-01-01T00:01');
        expect(moment(items[2].originalEventTime).utc().format('YYYY-MM-DDTHH:mm')).to.equal('1970-01-01T00:02');
        items.forEach((item_: any) => {
          const item = item_;
          expect(item._id).to.exist;
          expect(item.createdAt).to.exist;
          expect(item.updatedAt).to.exist;
          expect(moment(item.eventTime).diff(moment(), 'seconds'), 'delay in event min time').to.be.at.least(29);
          expect(moment(item.eventTime).diff(moment(), 'seconds'), 'delay in event max time').to.be.at.most(30);
          expect(moment(item.sentTime).valueOf(), 'sentTime same firstSentTime').to.equal(moment(item.firstSentTime).valueOf());
          expect(moment(item.sentTime).valueOf(), 'sentTime min value').is.greaterThan(moment().add(-5, 'second').valueOf());
          expect(moment(item.sentTime).valueOf(), 'sent time max value').is.at.most(moment().valueOf());
          delete item._id;
          delete item.eventTime;
          delete item.originalEventTime;
          delete item.firstSentTime;
          delete item.sentTime;
          delete item.createdAt;
          delete item.updatedAt;
        });
        expect(JSON.parse(JSON.stringify(items))).to.deep.equal([{
          priority: 999999,
          receiveCount: 1,
          queueId: queueItem._id,
          MessageSystemAttribute: {},
          maxReceiveCount: 3,
          data: {},
          MessageBody: '123',
          MessageAttribute: {},
          state: 'FAILURE',
          processingResponse: 'sent to slave',
          failureResponse: 'Event marked failed without response.',
        }, {
          priority: 999999,
          receiveCount: 1,
          queueId: queueItem._id,
          MessageSystemAttribute: {},
          maxReceiveCount: 3,
          data: {},
          MessageBody: '1234',
          MessageAttribute: {},
          state: 'PROCESSING',
          processingResponse: 'sent to slave',
        }, {
          priority: 999999,
          receiveCount: 1,
          queueId: queueItem._id,
          MessageSystemAttribute: {},
          maxReceiveCount: 3,
          data: {},
          MessageBody: '1235',
          MessageAttribute: {},
          state: 'SUCCESS',
          processingResponse: 'sent to slave',
          successResponse: 'this is success message',
        }]);
      });

      afterEach(async () => {
        slaveScheduler.cancel();
      });
    });

    context('retry of failed events', () => {
      let slaveScheduler: WorkerEventScheduler;
      let queue: SQS.Types.CreateQueueResult;
      let client: SimpleQueueServerClient;

      beforeEach(async () => {
        await dropDatabase();
        client = new SimpleQueueServerClient({
          region: Env.region,
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
          maxRetries: 0,
        });
        queue = await client.createQueue({ QueueName: 'queue1' });
        await client.sendMessageBatch({
          QueueUrl: queue.QueueUrl,
          Entries: [{ Id: '123', MessageBody: '123' }],
        });
        await delay();
      });

      it('should update event status as failed when event is not processed successfully', async () => {
        await new Promise((resolve: Function) => {
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
              setTimeout(resolve, 0);
              return Promise.reject('Error in processing');
            },
            '*/2 * * * * *');
        });
        await delay();
        const stats = await rp({ uri: `${Env.URL}/api/queues/events/stats`, json: true });
        expect(stats).to.deep.equal({
          PRIORITY_TOTAL: 0,
          queue1: { PRIORITY_TOTAL: 0, PRIORITY_999999: 0 },
          PRIORITY_999999: 0,
        });
        const queueItem = await mongoConnection.findOne('_Queue_Queues', { name: 'queue1' });
        const items = await mongoConnection.find('_Queue_Event', {}, { eventTime: -1 });
        items.forEach((item_: any) => {
          const item = item_;
          delete item.createdAt;
          delete item.updatedAt;
          delete item._id;
          delete item.sentTime;
          delete item.eventTime;
          delete item.firstSentTime;
          delete item.originalEventTime;
        });
        expect(JSON.parse(JSON.stringify(items))).to.deep.equal([{
          priority: 999999,
          receiveCount: 1,
          queueId: queueItem._id,
          data: {},
          MessageBody: '123',
          MessageAttribute: {},
          MessageSystemAttribute: {},
          state: 'FAILURE',
          maxReceiveCount: 3,
          failureResponse: 'Event marked failed without response.',
          processingResponse: 'sent to slave',
        }]);
      });

      afterEach(async () => {
        slaveScheduler.cancel();
      });
    });

    context('error handling of mark event success or failure api', () => {
      beforeEach(async () => {
        await dropDatabase();
      });

      it('should give error when uri is not present mongoDBAdapter', async () => {
        try {
          const x = new MongoDBAdapter({});
          await Promise.reject({ code: 99, message: 'should not reach here' });
        } catch (error) {
          expect(error.message).to.deep.equal('Database URI is missing');
        }
      });

      it('should give signature miss-match error when client credential are wrong', async () => {
        try {
          const client = new SimpleQueueServerClient({
            region: Env.region,
            endpoint: `${Env.URL}/api`,
            accessKeyId: 'wrongAccessKey',
            secretAccessKey: 'wrongSecret',
            maxRetries: 0,
          });
          await client.markEventFailure('eventId', `${Env.URL}/api/sqs/queue/queue1`, 'failureMessage');
          await Promise.reject({ code: 99, message: 'should not reach here.' });
        } catch (error) {
          const { code, message } = error;
          expect({ code, message }).to.deep.equal({
            code: 'SignatureDoesNotMatch',
            message: 'The request signature we calculated does not match the signature you provided.',
          });
        }
      });

      it('should give error when endpoint is wrong', async () => {
        try {
          const client = new SimpleQueueServerClient({
            region: Env.region,
            endpoint: `${Env.URL}/api/wrong`,
            accessKeyId: Env.accessKeyId,
            secretAccessKey: Env.secretAccessKey,
            maxRetries: 0,
          });
          await client.markEventSuccess('eventId', `${Env.URL}/api/wrong/sqs/queue/queue1`, 'failureMessage');
          await Promise.reject({ code: 99, message: 'should not reach here.' });
        } catch (error) {
          const { code, message } = error;
          expect({ code, message }).to.deep.equal({
            code: 404,
            message: '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Error</title>\n</head>\n'
              + '<body>\n<pre>Cannot POST /api/wrong/sqs/queue/queue1/event/eventId/success</pre>\n</body>\n</html>\n',
          });
        }
      });
    });
  });
}
