import debug from 'debug';
import rp from 'request-promise';
import * as schedule from 'node-schedule';
import { SlaveConfig } from './slave-config';
import { QueueManagerConfig } from '../event-manager/queue-manager-config';
import { EventItem } from '../event-manager';
import { container } from '../inversify';

const log = debug('queue-manager:EventScheduler');

class SlaveEventScheduler {
  static Config: { MAX_COUNT: number } = { MAX_COUNT: 1 };

  private readonly queueName: string;

  private config: SlaveConfig;

  private queueManagerConfig: QueueManagerConfig;

  constructor(queueName: string, listener: (item: EventItem) => Promise<void>, cronInterval?: string) {
    this.queueName = queueName;
    this.config = container.get(SlaveConfig);
    this.queueManagerConfig = container.get(QueueManagerConfig);
    this.config.listener = listener;
    this.initialize(cronInterval);
  }

  private initialize(cronInterval: string = '15 * * * * *'): void {
    this.checkIfMoreItemsCanBeProcessed();
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    log('Adding scheduler job for event slave.');
    schedule.scheduleJob(cronInterval, () => !this.config.polling && this.checkIfMoreItemsCanBeProcessed());
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
        const [response]: any = await rp({
          method: 'POST',
          uri: `${this.queueManagerConfig.masterURL}/queue/${this.queueName}/event/poll`,
          json: true,
        });
        if (!response) {
          this.config.hasMore = false;
          return;
        }
        await this.config.listener(new EventItem(response));
        this.requestEventToProcess();
      } catch (error) {
        log(error);
        if (!error.code && error.message.startsWith('Error: connect ECONNREFUSED')) {
          this.config.hasMore = false;
          return;
        }
      }
      this.config.config.count -= 1;
      this.checkIfMoreItemsCanBeProcessed();
    }, 0);
  }
}

export { SlaveEventScheduler };
