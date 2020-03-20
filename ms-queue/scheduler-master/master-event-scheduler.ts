import debug from 'debug';
import * as schedule from 'node-schedule';
import { EventItem, MSQueueRequestHandler } from '../event-manager';
import { container } from '../inversify';
import { MasterConfig } from './master-config';

const log = debug('ms-queue:EventScheduler');

class MasterEventScheduler {
  private readonly queueName: string;

  private readonly hostName: string;

  private job: schedule.Job;

  private config: MasterConfig;

  private msQueueRequestHandler: MSQueueRequestHandler;

  constructor(hostName: string, queueName: string, baseParams: any,
    listener: (nextItemListParams) => Promise<[object, Array<EventItem>]>, cronInterval?: string) {
    this.hostName = hostName;
    this.queueName = queueName;
    this.config = container.get(MasterConfig);
    this.config.listener = listener;
    this.config.baseParams = baseParams;
    this.msQueueRequestHandler = new MSQueueRequestHandler();
    this.initialize(cronInterval);
  }

  cancel(): void {
    this.job.cancel();
  }

  private initialize(cronInterval: string = '* * * * *'): void {
    log('Adding scheduler job for event master.');
    this.job = schedule.scheduleJob(cronInterval, () => !this.config.sending && this.requestEventsToAddInQueue(this.cloneBaseParams));
  }

  private get cloneBaseParams(): object {
    if (typeof this.config.baseParams === 'function') {
      return this.config.baseParams();
    }
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
        await this.msQueueRequestHandler.addEventsToQueue(this.hostName, this.queueName, items);
        this.requestEventsToAddInQueue(nextItemListParams);
      } catch (error) {
        log(error);
        this.config.sending = false;
      }
    }, 0);
  }
}

export { MasterEventScheduler };
