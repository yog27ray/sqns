import { expect } from 'chai';
import rp from 'request-promise';
import { EventItem } from '../event-manager';
import { EventState } from '../event-manager/event-item';
import { mongoConnection } from '../setup';
import { Env } from '../test-env';
import { ProcessingEventScheduler } from './processing-event-scheduler';

describe('SlaveEventSchedulerSpec', () => {
  context('installing a slave scheduler', () => {
    let slaveScheduler: ProcessingEventScheduler;

    beforeEach(async () => {
      await mongoConnection.dropDatabase();
      await rp({
        method: 'POST',
        uri: `${Env.URL}/api/queues/reset`,
        json: true,
      });
      await rp({
        method: 'POST',
        uri: `${Env.URL}/api/queue/queue1/event/bulk/new`,
        body: [{ id: '123', type: 'type1', eventTime: new Date(0) }, { id: '1234', type: 'type2', eventTime: new Date(1) }],
        json: true,
      });
    });

    it('should add job events in the queue', async () => {
      const result: Array<EventItem> = [];
      await new Promise((resolve: Function) => {
        let itemCheck = 2;
        slaveScheduler = new ProcessingEventScheduler(
          `${Env.URL}/api`,
          'queue1',
          async (item: EventItem) => {
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
      expect(result.map((each: EventItem) => each.toRequestBody())).to.deep.equal([
        { id: '123', priority: 999999, type: 'type1', data: {}, state: EventState.PENDING.valueOf() },
        { id: '1234', priority: 999999, type: 'type2', data: {}, state: EventState.PENDING.valueOf() },
      ]);
    });

    afterEach(async () => {
      slaveScheduler.cancel();
    });
  });

  context('processing multiple events', () => {
    let slaveScheduler: ProcessingEventScheduler;
    const ITEM_COUNT = 100;

    beforeEach(async () => {
      await mongoConnection.dropDatabase();
      await rp({
        method: 'POST',
        uri: `${Env.URL}/api/queues/reset`,
        json: true,
      });
      await rp({
        method: 'POST',
        uri: `${Env.URL}/api/queue/queue1/event/bulk/new`,
        body: new Array(ITEM_COUNT).fill(0).map((v: number, id: number) => ({ id: `${id}`, type: 'type1' })),
        json: true,
      });
    });

    it('should process 100 events in the queue', async () => {
      await new Promise((resolve: Function, reject: Function) => {
        let itemCheck = ITEM_COUNT;
        slaveScheduler = new ProcessingEventScheduler(
          `${Env.URL}/api`,
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
    let slaveScheduler: ProcessingEventScheduler;

    beforeEach(async () => {
      await mongoConnection.dropDatabase();
      await rp({
        method: 'POST',
        uri: `${Env.URL}/api/queues/reset`,
        json: true,
      });
      await rp({
        method: 'POST',
        uri: `${Env.URL}/api/queue/queue1/event/bulk/new`,
        body: [{ id: '123', type: 'type1' }, { id: '1234', type: 'type2' }],
        json: true,
      });
    });

    it('should re-attempt to check if server is ready.', async () => {
      await new Promise((resolve: Function) => {
        const timeout = setTimeout(resolve, 6000);
        slaveScheduler = new ProcessingEventScheduler(
          `${Env.URL}1/api`,
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
        slaveScheduler = new ProcessingEventScheduler(
          `${Env.URL}/api`,
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

  if (process.env.TEST_DB === 'mongoDB') {
    context('mongoDB test cases', () => {
      let slaveScheduler: ProcessingEventScheduler;

      beforeEach(async () => {
        await mongoConnection.dropDatabase();
        await rp({
          method: 'POST',
          uri: `${Env.URL}/api/queues/reset`,
          json: true,
        });
        await rp({
          method: 'POST',
          uri: `${Env.URL}/api/queue/queue1/event/bulk/new`,
          body: [
            { id: '123', type: 'type1', eventTime: new Date(0) },
            { id: '1234', type: 'type2', eventTime: new Date(60000) },
            { id: '1235', type: 'type3', eventTime: new Date(120000) },
          ],
          json: true,
        });
      });

      it('should call failure api when request fails.', async () => {
        await new Promise((resolve: Function) => {
          let count = 0;
          slaveScheduler = new ProcessingEventScheduler(
            `${Env.URL}/api`,
            'queue1',
            () => {
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
        const stats = await rp({ uri: `${Env.URL}/api/queues/events/stats`, json: true });
        expect(stats).to.deep.equal({
          PRIORITY_TOTAL: 0,
          queue1: { PRIORITY_TOTAL: 0, PRIORITY_999999: 0 },
          PRIORITY_999999: 0,
        });
        const items = await mongoConnection.find('_Queue_queue1', {}, { eventTime: -1 });
        items.forEach((item_: any) => {
          const item = item_;
          delete item.createdAt;
        });
        expect(JSON.parse(JSON.stringify(items))).to.deep.equal([{
          _id: '1235',
          eventTime: '1970-01-01T00:02:00.000Z',
          state: 'SUCCESS',
          type: 'type3',
          data: {},
          priority: 999999,
          processingResponse: { message: 'sent to slave' },
          successResponse: { message: 'this is success message' },
        }, {
          _id: '1234',
          eventTime: '1970-01-01T00:01:00.000Z',
          state: 'PROCESSING',
          type: 'type2',
          data: {},
          priority: 999999,
          processingResponse: { message: 'sent to slave' },
        }, {
          _id: '123',
          eventTime: '1970-01-01T00:00:00.000Z',
          state: 'FAILURE',
          type: 'type1',
          data: {},
          priority: 999999,
          processingResponse: { message: 'sent to slave' },
          failureResponse: { message: 'Event marked failed without response.' },
        }]);
      });

      afterEach(async () => {
        slaveScheduler.cancel();
      });
    });
  }
});
