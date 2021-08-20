import * as schedule from 'node-schedule';
import { BASE_CONFIG, KeyValue } from '../../../../typings/common';
import { QueueStorageToQueueConfigListener } from '../../../../typings/config';
import { logger } from '../../common/logger/logger';
import { Queue } from '../../common/model/queue';
import { QueueStorageToQueueConfig } from './queue-storage-to-queue-config';

const log = logger.instance('QueueStorageToQueueScheduler');

export class QueueStorageToQueueScheduler {
  private _job: schedule.Job;

  private config: QueueStorageToQueueConfig;

  constructor(queue: Queue, baseParams: BASE_CONFIG, listener: QueueStorageToQueueConfigListener, cronInterval?: string) {
    this.config = new QueueStorageToQueueConfig();
    this.config.listener = listener;
    this.addQueue(queue);
    this.config.baseParams = baseParams;
    log.info(`Adding scheduler job for queueARN: ${queue.arn}`);
    this._job = schedule.scheduleJob(cronInterval || '*/5 * * * * *', () => {
      log.info('Executing Manage Job Interval');
      this.startProcessingOfQueue();
    });
  }

  cancel(): void {
    this._job.cancel();
  }

  addQueue(queue: Queue): void {
    if (this.config.knownQueueARN[queue.arn]) {
      return;
    }
    log.info(`Adding queueARN: ${queue.arn}`);
    this.config.knownQueueARN[queue.arn] = true;
    this.config.queues.push(queue);
  }

  private getQueueNames(): Array<string> {
    return this.config.queues.map((each: Queue) => each.name);
  }

  private startProcessingOfQueue(): void {
    if (this.config.sending) {
      log.verbose('Queues:', this.getQueueNames(), 'already fetching events.');
      return;
    }
    log.info('Queues:', this.getQueueNames(), 'start fetching events.');
    this.findEventsToAddInQueueAsynchronous(this.config.queues.map((each: Queue) => each), this.config.cloneBaseParams);
  }

  private findEventsToAddInQueueAsynchronous(queues: Array<Queue>, itemListParams: KeyValue): void {
    this.config.sending = true;
    this.findEventsToAddInQueue(queues, itemListParams)
      .catch((error: Error) => {
        log.error(error);
        this.config.sending = false;
      });
  }

  private async findEventsToAddInQueue(queues: Array<Queue>, itemListParams: KeyValue): Promise<void> {
    const [nextItemListParams, hasMoreData] = await this.config.listener(queues, itemListParams);
    if (!hasMoreData) {
      log.info('Queues:', this.getQueueNames(), 'No more data to fetch, resetting.');
      this.config.sending = false;
      return;
    }
    this.findEventsToAddInQueueAsynchronous(queues, nextItemListParams);
  }
}
