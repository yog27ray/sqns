import { expect } from 'chai';
import { KeyValue, RequestItem } from '../../../../typings';
import { dropDatabase } from '../../../setup';
import { Env } from '../../../test-env';
import { RequestClient } from '../../common/request-client/request-client';
import { ManagerEventScheduler } from './manager-event-scheduler';

describe('ManagerEventSchedulerSpec', () => {
  context('installing a manager scheduler', () => {
    let masterScheduler: ManagerEventScheduler;

    beforeEach(async () => dropDatabase());

    it('should add job events in the queue', async () => {
      await new Promise((resolve: (value?: unknown) => void) => {
        masterScheduler = new ManagerEventScheduler(
          {
            endpoint: `${Env.URL}/api`,
            accessKeyId: Env.accessKeyId,
            secretAccessKey: Env.secretAccessKey,
          },
          { queue1: { page: 0 } },
          async (queueName: string, { page }: { page: number }) => {
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
      const stats = await new RequestClient().get(`${Env.URL}/api/queues/events/stats`, true);
      expect(stats).to.deep.equal({
        PRIORITY_TOTAL: 2,
        'arn:sqns:sqs:sqns:1:queue1': { PRIORITY_TOTAL: 2, PRIORITY_999999: 2 },
        PRIORITY_999999: 2,
      });
    });

    it('should add job events in the queue when base params is function', async () => {
      await new Promise((resolve: (value?: unknown) => void) => {
        masterScheduler = new ManagerEventScheduler(
          {
            endpoint: `${Env.URL}/api`,
            accessKeyId: Env.accessKeyId,
            secretAccessKey: Env.secretAccessKey,
          },
          { queue1: (): KeyValue => ({ page: 0 }) },
          async (queueName: string, { page }: { page: number }) => {
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
      const stats = await new RequestClient().get(`${Env.URL}/api/queues/events/stats`, true);
      expect(stats).to.deep.equal({
        PRIORITY_TOTAL: 2,
        'arn:sqns:sqs:sqns:1:queue1': { PRIORITY_TOTAL: 2, PRIORITY_999999: 2 },
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

    beforeEach(async () => dropDatabase());

    it('should re-attempt to check if server is ready.', async () => {
      await new Promise((resolve: (value?: unknown) => void) => {
        let maxAttemptCount = 2;
        masterScheduler = new ManagerEventScheduler(
          {
            endpoint: `${Env.URL}/api/wrong`,
            accessKeyId: Env.accessKeyId,
            secretAccessKey: Env.secretAccessKey,
          },
          { queue1: { page: 0 } },
          async (queueName: string, { page }: { page: number }) => {
            if (!maxAttemptCount) {
              resolve();
            }
            maxAttemptCount -= 1;
            return [{ page: page + 1 }, [{ MessageBody: 'type1' }]];
          }, '*/2 * * * * *');
      });
      const stats = await new RequestClient().get(`${Env.URL}/api/queues/events/stats`, true);
      expect(stats).to.deep.equal({ PRIORITY_TOTAL: 0 });
    });

    afterEach(async () => {
      if (masterScheduler) {
        masterScheduler.cancel();
      }
    });
  });
});
