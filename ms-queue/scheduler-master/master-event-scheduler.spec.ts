import rp from 'request-promise';
import { expect } from 'chai';
import { MasterEventScheduler } from './master-event-scheduler';
import { Env } from '../test-env';
import { EventItem } from '../event-manager';

describe('MasterEventSchedulerSpec', () => {
  context('installing a master scheduler', () => {
    let masterScheduler: MasterEventScheduler;

    beforeEach(async () => {
      await rp({
        method: 'POST',
        uri: `${Env.URL}/api/queues/reset`,
        body: { id: '123', type: 'type1' },
        json: true,
      });
    });

    it('should add job events in the queue', async () => {
      await new Promise((resolve: Function) => {
        masterScheduler = new MasterEventScheduler(
          `${Env.URL}/api`,
          'queue1',
          { page: 0 },
          async ({ page }: { page: number }) => {
            const result: Array<EventItem> = [];
            if (!page) {
              result.push(new EventItem({ type: 'type1', id: '123' }));
            } else if (page === 1) {
              result.push(new EventItem({ type: 'type1', id: '1234' }));
            } else if (page === 2) {
              resolve();
            }
            return [{ page: page + 1 }, result];
          }, '*/10 * * * * *');
      });
      const stats = await rp({ uri: `${Env.URL}/api/queues/events/stats`, json: true });
      expect(stats).to.deep.equal({
        PRIORITY_TOTAL: 2,
        queue1: { PRIORITY_TOTAL: 2, PRIORITY_999999: 2 },
        PRIORITY_999999: 2,
      });
    });

    afterEach(async () => {
      if (masterScheduler) {
        masterScheduler.cancel();
      }
    });
  });

  context('error handling of master scheduler', () => {
    let masterScheduler: MasterEventScheduler;

    beforeEach(async () => {
      await rp({
        method: 'POST',
        uri: `${Env.URL}/api/queues/reset`,
        body: { id: '123', type: 'type1' },
        json: true,
      });
    });

    it('should re-attempt to check if server is ready.', async () => {
      await new Promise((resolve: Function) => {
        let maxAttemptCount = 2;
        masterScheduler = new MasterEventScheduler(
          `${Env.URL}1/api`,
          'queue1',
          { page: 0 },
          async ({ page }: { page: number }) => {
            if (!maxAttemptCount) {
              resolve();
            }
            maxAttemptCount -= 1;
            return [{ page: page + 1 }, [new EventItem({ type: 'type1', id: '123' })]];
          }, '*/2 * * * * *');
      });
      const stats = await rp({ uri: `${Env.URL}/api/queues/events/stats`, json: true });
      expect(stats).to.deep.equal({ PRIORITY_TOTAL: 0 });
    });

    afterEach(async () => {
      if (masterScheduler) {
        masterScheduler.cancel();
      }
    });
  });
});
