import debug from 'debug';
import * as schedule from 'node-schedule';
import { QueueStorageToQueueConfig } from './queue-storage-to-queue-config';

const log = debug('ms-queue:QueueStorageToQueueScheduler');

class QueueStorageToQueueScheduler {
  private _job: schedule.Job;

  private config: QueueStorageToQueueConfig;

  constructor(queueName: string, baseParams: () => { [key: string]: any },
    listener: (queueName: string, nextItemListParams: any) => Promise<[{ [key: string]: any }, boolean]>,
    cronInterval: string = '*/5 * * * * *') {
    this.config = new QueueStorageToQueueConfig();
    this.config.listener = listener;
    this.config.queueName = queueName;
    this.config.baseParams = baseParams;
    log(`Adding scheduler job for queueName: ${queueName}`);
    this._job = schedule.scheduleJob(cronInterval, () => this.startProcessingOfQueue());
  }

  cancel(): void {
    this._job.cancel();
  }

  private startProcessingOfQueue(): void {
    if (this.config.sending) {
      return;
    }
    this.findEventsToAddInQueue(this.cloneBaseParams);
  }

  private get cloneBaseParams(): { [key: string]: any } {
    return this.config.baseParams;
  }

  private findEventsToAddInQueue(itemListParams: { [key: string]: any }): void {
    this.config.sending = true;
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setTimeout(async () => {
      try {
        const [nextItemListParams, hasMoreData] = await this.config.listener(this.config.queueName, itemListParams);
        if (!hasMoreData) {
          this.config.sending = false;
          return;
        }
        this.findEventsToAddInQueue(nextItemListParams);
      } catch (error) {
        log(error);
        this.config.sending = false;
      }
    }, 0);
  }
}

export { QueueStorageToQueueScheduler };
