import SQS from 'aws-sdk/clients/sqs';
import debug from 'debug';
import * as schedule from 'node-schedule';
import { SimpleQueueServerClient } from '../aws';
import { RequestItem } from '../request-response-types/request-item';
import { ManagerConfig } from './manager-config';

const log = debug('ms-queue:EventScheduler');

class ManagerEventScheduler {
  private queueName: string;

  private job: schedule.Job;

  private config: ManagerConfig;

  private client: SimpleQueueServerClient;

  private queue: SQS.CreateQueueResult;

  constructor(options: SQS.ClientConfiguration, queueName: string, baseParams: { [key: string]: any },
    listener: (nextItemListParams) => Promise<[{ [key: string]: any }, Array<RequestItem>]>, cronInterval?: string) {
    this.queueName = queueName;
    this.config = new ManagerConfig();
    this.config.listener = listener;
    this.config.baseParams = baseParams;
    this.client = new SimpleQueueServerClient(options);
    this.initialize(cronInterval);
  }

  cancel(): void {
    this.job.cancel();
  }

  private async findOrCreateQueue(): Promise<void> {
    if (this.queue) {
      return;
    }
    this.queue = await this.client.createQueue({ QueueName: this.queueName });
  }

  private initialize(cronInterval: string = '* * * * *'): void {
    log('Adding scheduler job for event master.');
    this.job = schedule.scheduleJob(cronInterval, () => !this.config.sending && this.requestEventsToAddInQueue(this.cloneBaseParams));
  }

  private get cloneBaseParams(): { [key: string]: any } {
    if (typeof this.config.baseParams === 'function') {
      const baseParamsFunction: () => { [key: string]: any } = this.config.baseParams as () => { [key: string]: any };
      return baseParamsFunction();
    }
    return JSON.parse(JSON.stringify(this.config.baseParams)) as { [key: string]: any };
  }

  private requestEventsToAddInQueue(itemListParams: { [key: string]: any }): void {
    this.config.sending = true;
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setTimeout(async () => {
      try {
        const [nextItemListParams, items] = await this.config.listener(itemListParams);
        if (!items.length) {
          this.config.sending = false;
          return;
        }
        await this.addEventsToQueue(items);
        this.requestEventsToAddInQueue(nextItemListParams);
      } catch (error) {
        log(error);
        this.config.sending = false;
      }
    }, 0);
  }

  private async addEventsToQueue(entries: Array<RequestItem>): Promise<any> {
    await this.findOrCreateQueue();
    await this.client.sendMessageBatch({
      QueueUrl: this.queue.QueueUrl,
      Entries: entries.map((entry: RequestItem, index: number) => ({
        Id: `${index + 1}`,
        MessageBody: entry.MessageBody,
        DelaySeconds: entry.DelaySeconds,
        MessageAttributes: entry.MessageAttributes,
        MessageSystemAttributes: entry.MessageSystemAttributes,
        MessageDeduplicationId: entry.MessageDeduplicationId,
        MessageGroupId: entry.MessageGroupId,
      })),
    });
  }
}

export { ManagerEventScheduler };
