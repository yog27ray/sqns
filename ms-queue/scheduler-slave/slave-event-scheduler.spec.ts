import rp from 'request-promise';
import { expect } from 'chai';
import { Env } from '../test-env';
import { EventItem } from '../event-manager';
import { SlaveEventScheduler } from './slave-event-scheduler';

describe('SlaveEventSchedulerSpec', () => {
  context('installing a slave scheduler', () => {
    let slaveScheduler: SlaveEventScheduler;

    beforeEach(async () => {
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

    it('should add job events in the queue', async () => {
      const result: Array<EventItem> = [];
      await new Promise((resolve: Function) => {
        let itemCheck = 2;
        slaveScheduler = new SlaveEventScheduler(
          `${Env.URL}/api`,
          'queue1',
          async (item: EventItem) => {
            result.push(item);
            itemCheck -= 1;
            if (!itemCheck) {
              resolve();
            }
          }, '*/2 * * * * *');
      });
      const stats = await rp({ uri: `${Env.URL}/api/queues/events/stats`, json: true });
      expect(stats).to.deep.equal({ PRIORITY_TOTAL: 0 });
      expect(result.map((each: EventItem) => each.toRequestBody())).to.deep.equal([
        { id: '123', priority: 999999, type: 'type1', data: {} },
        { id: '1234', priority: 999999, type: 'type2', data: {} },
      ]);
    });

    afterEach(async () => {
      slaveScheduler.cancel();
    });
  });

  context('processing multiple events', () => {
    let slaveScheduler: SlaveEventScheduler;
    const ITEM_COUNT = 100;

    beforeEach(async () => {
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
        slaveScheduler = new SlaveEventScheduler(
          `${Env.URL}/api`,
          'queue1',
          // eslint-disable-next-line promise/param-names
          () => new Promise((resolve1: Function) => setTimeout(() => {
            resolve1();
            itemCheck -= 1;
            if (!itemCheck) {
              resolve();
            }
          }, 100)),
          '*/2 * * * * *');
      });
      const stats = await rp({ uri: `${Env.URL}/api/queues/events/stats`, json: true });
      expect(stats).to.deep.equal({ PRIORITY_TOTAL: 0 });
    });

    afterEach(async () => {
      slaveScheduler.cancel();
    });
  });

  context('error handling of slave scheduler', () => {
    let slaveScheduler: SlaveEventScheduler;

    beforeEach(async () => {
      await rp({
        method: 'POST',
        uri: `${Env.URL}/api/queues/reset`,
        body: { id: '123', type: 'type1' },
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
        slaveScheduler = new SlaveEventScheduler(
          `${Env.URL}1/api`,
          'queue1',
          async () => {
            clearTimeout(timeout);
          }, '*/2 * * * * *');
      });
      const stats = await rp({ uri: `${Env.URL}/api/queues/events/stats`, json: true });
      expect(stats).to.deep.equal({
        PRIORITY_TOTAL: 2,
        queue1: { PRIORITY_TOTAL: 2, PRIORITY_999999: 2 },
        PRIORITY_999999: 2,
      });
    });

    afterEach(async () => {
      slaveScheduler.cancel();
    });
  });
});
