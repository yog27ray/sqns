import debug from 'debug';
import rp from 'request-promise';
import schedule from 'node-schedule';
import { MasterConfig } from './master-config';
import { QueueManagerConfig } from '../event-manager/queue-manager-config';
import { EventItem } from '../event-manager';
import { container } from '../inversify';

const log = debug('queue-manager:EventScheduler');

class MasterEventScheduler {
  private config: MasterConfig;

  private queueManagerConfig: QueueManagerConfig;

  constructor(baseParams: any, listener: (nextItemListParams) => Promise<[object, Array<any>]>, cronInterval?: string) {
    this.config = container.get(MasterConfig);
    this.queueManagerConfig = container.get(QueueManagerConfig);
    this.config.listener = listener;
    this.config.baseParams = baseParams;
    this.initialize(cronInterval);
  }

  private initialize(cronInterval: string = '* * * * *'): void {
    this.requestEventsToAddInQueue(this.cloneBaseParams);
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    log('Adding scheduler job for event master.');
    schedule.scheduleJob(cronInterval, () => !this.config.sending && this.requestEventsToAddInQueue(this.cloneBaseParams));
  }

  private get cloneBaseParams(): object {
    return JSON.parse(JSON.stringify(this.config.baseParams));
  }

  private requestEventsToAddInQueue(itemListParams: object): void {
    this.config.sending = true;
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setTimeout(async () => {
      try {
        const [nextItemListParams, items] = await this.config.listener(itemListParams);
        if (!items.length) {
          this.config.sending = false;
          return;
        }
        await rp({
          method: 'POST',
          uri: `${this.queueManagerConfig.masterURL}/queue/${this.queueManagerConfig.queueName}/event/bulk/new`,
          body: items.map((item: EventItem) => item.toRequestBody()),
          json: true,
        })
          .catch(async (error: any) => {
            if (!error.code && error.message.startsWith('Error: connect ECONNREFUSED')) {
              // eslint-disable-next-line no-console
              console.log(error.message);
              return;
            }
            await Promise.reject(error);
          });
        this.requestEventsToAddInQueue(nextItemListParams);
      } catch (error) {
        log(error);
        this.config.sending = false;
      }
    }, 0);
  }
}

export { MasterEventScheduler };
