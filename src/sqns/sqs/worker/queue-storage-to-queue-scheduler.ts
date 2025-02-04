import * as schedule from 'node-schedule';
import { BASE_CONFIG } from '../../../../typings/common';
import { QueueStorageToQueueConfigListener } from '../../../../typings/config';
import { KeyValue } from '../../../client';
import { logger } from '../../common/logger/logger';
import { ActiveEventManagement } from './active-event-management';
import { QueueStorageToQueueConfig } from './queue-storage-to-queue-config';

const log = logger.instance('QueueStorageToQueueScheduler');

export class QueueStorageToQueueScheduler {
  private _job: schedule.Job;

  private config: QueueStorageToQueueConfig;

  constructor(baseParams: BASE_CONFIG, listener: QueueStorageToQueueConfigListener, cronInterval?: string) {
    this.config = new QueueStorageToQueueConfig();
    this.config.listener = listener;
    this.config.baseParams = baseParams;
    log.info('Adding scheduler job');
    this._job = schedule.scheduleJob(cronInterval || '*/5 * * * * *', () => {
      log.info('Executing Manage Job Interval');
      ActiveEventManagement.resetActiveEvents();
      this.startProcessingOfQueue();
    });
  }

  cancel(): void {
    this._job.cancel();
  }

  private startProcessingOfQueue(): void {
    if (this.config.sending) {
      log.verbose('already fetching events.');
      return;
    }
    log.info('start fetching events.');
    this.findEventsToAddInQueueAsynchronous(this.config.cloneBaseParams);
  }

  private findEventsToAddInQueueAsynchronous(itemListParams: KeyValue): void {
    this.config.sending = true;
    this.findEventsToAddInQueue(itemListParams)
      .catch((error: Error) => {
        log.error(error);
        this.config.sending = false;
      });
  }

  private async findEventsToAddInQueue(itemListParams: KeyValue): Promise<void> {
    const [nextItemListParams, hasMoreData] = await this.config.listener(itemListParams);
    if (!hasMoreData) {
      log.info('No more data to fetch, resetting.');
      this.config.sending = false;
      return;
    }
    this.findEventsToAddInQueueAsynchronous(nextItemListParams);
  }
}
