import SQS from 'aws-sdk/clients/sqs';
import debug from 'debug';
import * as schedule from 'node-schedule';
import { SimpleQueueServerClient } from '../aws';
import { ResponseItem } from '../request-response-types/response-item';
import { WorkerConfig } from './worker-config';

const log = debug('ms-queue:EventScheduler');

class WorkerEventScheduler {
  private Config: { MAX_COUNT: number } = { MAX_COUNT: 1 };

  private client: SimpleQueueServerClient;

  private readonly queueName: string;

  private job: schedule.Job;

  private config: WorkerConfig;

  private queue: SQS.CreateQueueResult;

  constructor(options: SQS.ClientConfiguration, queueName: string, listener: (item: ResponseItem) => Promise<string>,
    cronInterval?: string) {
    this.queueName = queueName;
    this.config = new WorkerConfig();
    this.config.listener = listener;
    this.client = new SimpleQueueServerClient(options);
    this.initialize(cronInterval);
    this.setParallelProcessingCount(1);
  }

  setParallelProcessingCount(count: number): void {
    this.Config.MAX_COUNT = count;
  }

  cancel(): void {
    this.job.cancel();
  }

  private initialize(cronInterval: string = '15 * * * * *'): void {
    log('Adding scheduler job for event slave.');
    this.job = schedule.scheduleJob(cronInterval, () => !this.config.polling && this.checkIfMoreItemsCanBeProcessed());
  }

  private checkIfMoreItemsCanBeProcessed(): void {
    this.config.polling = true;
    if (this.config.config.count >= this.Config.MAX_COUNT) {
      return;
    }
    while (this.config.config.count < this.Config.MAX_COUNT && this.config.hasMore) {
      this.requestEventToProcess();
    }
    if (!this.config.config.count && !this.config.hasMore) {
      this.config.polling = false;
      this.config.hasMore = true;
    }
  }

  private async findOrCreateQueue(): Promise<void> {
    if (this.queue) {
      return;
    }
    this.queue = await this.client.createQueue({ QueueName: this.queueName });
  }

  private requestEventToProcess(): void {
    this.config.config.count += 1;
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setTimeout(async () => {
      try {
        await this.findOrCreateQueue();
        const result = await this.client
          .receiveMessage({ QueueUrl: this.queue.QueueUrl, MessageAttributeNames: ['ALL'] });
        const { Messages: [eventItem] } = result;
        if (!eventItem) {
          this.config.hasMore = false;
        } else {
          const [isSuccess, response] = await this.processEvent(eventItem);
          if (isSuccess) {
            await this.client.markEventSuccess(eventItem.MessageId, this.queue.QueueUrl, response);
          } else {
            await this.client.markEventFailure(eventItem.MessageId, this.queue.QueueUrl, response);
          }
        }
      } catch (error) {
        log(error);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
        if (!error.code && error.message && error.message.startsWith('Error: connect ECONNREFUSED')) {
          this.config.hasMore = false;
        }
      }
      this.config.config.count -= 1;
      this.checkIfMoreItemsCanBeProcessed();
    }, 0);
  }

  private async processEvent(responseItem: ResponseItem): Promise<[boolean, string]> {
    try {
      const response = await this.config.listener(responseItem);
      return [true, response];
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return [false, error.message];
    }
  }
}

export { WorkerEventScheduler };
