import debug from 'debug';
import * as schedule from 'node-schedule';
import { EventItem, MSQueueRequestHandler } from '../event-manager';
import { container } from '../inversify';
import { SlaveConfig } from './slave-config';

const log = debug('ms-queue:EventScheduler');

class SlaveEventScheduler {
  static Config: { MAX_COUNT: number } = { MAX_COUNT: 1 };

  private readonly hostName: string;

  private readonly queueName: string;

  private job: schedule.Job;

  private config: SlaveConfig;

  private msQueueRequestHandler: MSQueueRequestHandler;

  constructor(hostName: string, queueName: string, listener: (item: EventItem) => Promise<void>, cronInterval?: string) {
    this.hostName = hostName;
    this.queueName = queueName;
    this.config = container.get(SlaveConfig);
    this.config.listener = listener;
    this.msQueueRequestHandler = new MSQueueRequestHandler();
    this.initialize(cronInterval);
  }

  cancel(): void {
    this.job.cancel();
  }

  private initialize(cronInterval: string = '15 * * * * *'): void {
    log('Adding scheduler job for event slave.');
    this.job = schedule.scheduleJob(cronInterval, () => this.checkIfMoreItemsCanBeProcessed());
  }

  private checkIfMoreItemsCanBeProcessed(): void {
    this.config.polling = true;
    if (this.config.config.count >= SlaveEventScheduler.Config.MAX_COUNT) {
      return;
    }
    while (this.config.config.count < SlaveEventScheduler.Config.MAX_COUNT && this.config.hasMore) {
      this.requestEventToProcess();
    }
    if (!this.config.config.count && !this.config.hasMore) {
      this.config.polling = false;
    }
  }

  private requestEventToProcess(): void {
    this.config.config.count += 1;
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setTimeout(async () => {
      try {
        const eventItem: EventItem = await this.msQueueRequestHandler.fetchEventsFromQueue(this.hostName, this.queueName);
        if (!eventItem) {
          this.config.hasMore = false;
          return;
        }
        await this.config.listener(eventItem);
      } catch (error) {
        log(error);
        if (!error.code && error.message.startsWith('Error: connect ECONNREFUSED')) {
          this.config.hasMore = false;
        }
      }
      this.config.config.count -= 1;
      this.checkIfMoreItemsCanBeProcessed();
    }, 0);
  }
}

export { SlaveEventScheduler };
