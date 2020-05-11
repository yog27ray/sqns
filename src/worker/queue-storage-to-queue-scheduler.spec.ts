import { expect } from 'chai';
import rp from 'request-promise';
import { EventItem } from '../event-manager';
import { EventState } from '../event-manager/event-item';
import { mongoConnection } from '../setup';
import { Env } from '../test-env';
import { QueueStorageToQueueScheduler } from './queue-storage-to-queue-scheduler';

describe('QueueStorageToQueueSchedulerSpec', () => {
  context('error handling of queue storage to queue scheduler', () => {
    let queueStorageToQueueScheduler: QueueStorageToQueueScheduler;

    beforeEach(async () => {
      await mongoConnection.dropDatabase();
    });

    it('should re-attempt to check if server is ready.', async () => {
      await new Promise((resolve: Function, reject: Function) => {
        let attempt = 2;
        const timeout = setTimeout(() => reject('should not reach here.'), 6000);
        queueStorageToQueueScheduler = new QueueStorageToQueueScheduler(
          'queue1',
          () => ({}),
          async () => {
            if (!attempt) {
              clearTimeout(timeout);
              resolve();
            } else {
              attempt -= 1;
              await Promise.reject(Error('Test Error'));
            }
            return [[], false];
          }, '*/2 * * * * *');
      });
    });

    afterEach(async () => {
      queueStorageToQueueScheduler.cancel();
    });
  });
});
