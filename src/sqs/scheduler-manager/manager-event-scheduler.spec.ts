import { expect } from 'chai';
import rp from 'request-promise';
import { dropDatabase } from '../../setup';
import { deleteQueues, Env } from '../../test-env';
import { SimpleQueueServerClient } from '../aws';
import { RequestItem } from '../request-response-types/request-item';
import { ManagerEventScheduler } from './manager-event-scheduler';

describe('CollectorEventSchedulerSpec', () => {
  context('installing a collector scheduler', () => {
    let masterScheduler: ManagerEventScheduler;

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
      masterScheduler = new ManagerEventScheduler(
        {},
        'queue1',
        { page: 0 },
        async () =>  [{ page: 1 }, []]);
      masterScheduler.cancel();
    });

    it('should add job events in the queue', async () => {
      await new Promise((resolve: () => void) => {
        masterScheduler = new ManagerEventScheduler(
          {
            region: Env.region,
            endpoint: `${Env.URL}/api`,
            accessKeyId: Env.accessKeyId,
            secretAccessKey: Env.secretAccessKey,
            maxRetries: 0,
          },
          'queue1',
          { page: 0 },
          async ({ page }: { page: number }) => {
            const results: Array<RequestItem> = [];
            if (!page) {
              results.push({ MessageBody: '123' });
            } else if (page === 1) {
              results.push({ MessageBody: '1234' });
            } else if (page === 2) {
              resolve();
            }
            return [{ page: page + 1 }, results];
          }, '*/10 * * * * *');
      });
      const stats = await rp({ uri: `${Env.URL}/api/queues/events/stats`, json: true });
      expect(stats).to.deep.equal({
        PRIORITY_TOTAL: 2,
        queue1: { PRIORITY_TOTAL: 2, PRIORITY_999999: 2 },
        PRIORITY_999999: 2,
      });
    });

    it('should add job events in the queue when base params is function', async () => {
      await new Promise((resolve: () => void) => {
        masterScheduler = new ManagerEventScheduler(
          {
            region: Env.region,
            endpoint: `${Env.URL}/api`,
            accessKeyId: Env.accessKeyId,
            secretAccessKey: Env.secretAccessKey,
            maxRetries: 0,
          },
          'queue1',
          () => ({ page: 0 }),
          async ({ page }: { page: number }) => {
            const result: Array<RequestItem> = [];
            if (!page) {
              result.push({ MessageBody: 'type1' });
            } else if (page === 1) {
              result.push({ MessageBody: 'type1' });
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
    let masterScheduler: ManagerEventScheduler;

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
    });

    it('should re-attempt to check if server is ready.', async () => {
      await new Promise((resolve: () => void) => {
        let maxAttemptCount = 2;
        masterScheduler = new ManagerEventScheduler(
          {
            region: Env.region,
            endpoint: `${Env.URL}/api/wrong`,
            accessKeyId: Env.accessKeyId,
            secretAccessKey: Env.secretAccessKey,
            maxRetries: 0,
          },
          'queue1',
          { page: 0 },
          async ({ page }: { page: number }) => {
            if (!maxAttemptCount) {
              resolve();
            }
            maxAttemptCount -= 1;
            return [{ page: page + 1 }, [{ MessageBody: 'type1' }]];
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
