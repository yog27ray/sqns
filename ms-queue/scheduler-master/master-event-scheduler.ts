import debug from 'debug';
import rp from 'request-promise';
import * as schedule from 'node-schedule';
import { MasterConfig } from './master-config';
import { EventItem } from '../event-manager';
import { container } from '../inversify';

const log = debug('ms-queue:EventScheduler');

class MasterEventScheduler {
  private readonly queueName: string;

  private readonly hostName: string;

  private job: schedule.Job;

  private config: MasterConfig;

  constructor(hostName: string, queueName: string, baseParams: any,
    listener: (nextItemListParams) => Promise<[object, Array<EventItem>]>, cronInterval?: string) {
    this.hostName = hostName;
    this.queueName = queueName;
    this.config = container.get(MasterConfig);
    this.config.listener = listener;
    this.config.baseParams = baseParams;
    this.initialize(cronInterval);
  }

  private initialize(cronInterval: string = '* * * * *'): void {
    log('Adding scheduler job for event master.');
    this.job = schedule.scheduleJob(cronInterval, () => !this.config.sending && this.requestEventsToAddInQueue(this.cloneBaseParams));
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
          uri: `${this.hostName}/queue/${this.queueName}/event/bulk/new`,
          body: items.map((item: EventItem) => item.toRequestBody()),
          json: true,
        });
        this.requestEventsToAddInQueue(nextItemListParams);
      } catch (error) {
        log(error);
        this.config.sending = false;
      }
    }, 0);
  }

  cancel(): void {
    this.job.cancel();
  }
}

export { MasterEventScheduler };
