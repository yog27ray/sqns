import * as schedule from 'node-schedule';
import { SQNSClientConfig } from '../../../../typings/client-confriguation';
import { ManagerQueueConfigListener } from '../../../../typings/config';
import { BASE_CONFIG, KeyValue, RequestItem } from '../../../../typings/typings';
import { logger } from '../../common/logger/logger';
import { SQNSClient } from '../../s-q-n-s-client';
import { ManagerQueueConfig } from './manager-queue-config';

const log = logger.instance('sqns:ManagerEventScheduler');

export class ManagerEventScheduler {
  private readonly queueNames: Array<string>;

  private job: schedule.Job;

  private readonly queueConfigs: { [key: string]: ManagerQueueConfig };

  private client: SQNSClient;

  constructor(options: SQNSClientConfig, queueBaseParams: { [key: string]: BASE_CONFIG },
    listener: ManagerQueueConfigListener, cronInterval?: string) {
    this.queueNames = Object.keys(queueBaseParams);
    this.queueConfigs = {};
    this.queueNames.forEach((queueName: string) => {
      const mangerConfig = new ManagerQueueConfig(queueName);
      mangerConfig.listener = listener;
      mangerConfig.queryBaseParams = queueBaseParams[queueName];
      this.queueConfigs[queueName] = mangerConfig;
    });
    this.client = new SQNSClient(options);
    this.initialize(cronInterval);
  }

  cancel(): void {
    this.job.cancel();
  }

  private async findOrCreateQueue(queueConfig_: ManagerQueueConfig): Promise<void> {
    const queueConfig = queueConfig_;
    if (queueConfig.queue) {
      return;
    }
    queueConfig.queue = await this.client.createQueue({ QueueName: queueConfig.queueName });
  }

  private initialize(cronInterval: string = '* * * * *'): void {
    log.info('Adding scheduler job for event master.');
    this.job = schedule.scheduleJob(cronInterval, () => {
      log.info('Executing Manage Job Interval');
      const queuesNotSendingEvent = this.queueNames.filter((queueName: string) => !this.queueConfigs[queueName].sending);
      log.info('Queues to start event sending:', queuesNotSendingEvent);
      queuesNotSendingEvent.forEach((queueName: string) => this
        .requestEventsToAddInQueueAsynchronous(this.queueConfigs[queueName], this.queueConfigs[queueName].cloneBaseParams));
    });
  }

  private requestEventsToAddInQueueAsynchronous(queueConfig_: ManagerQueueConfig, itemListParams: KeyValue): void {
    const queueConfig = queueConfig_;
    queueConfig.sending = true;
    this.requestEventsToAddInQueue(queueConfig, itemListParams)
      .catch((error: Error) => {
        log.error(error);
        queueConfig.sending = false;
      });
  }

  private async requestEventsToAddInQueue(queueConfig_: ManagerQueueConfig, itemListParams: KeyValue): Promise<void> {
    const queueConfig = queueConfig_;
    const [nextItemListParams, items] = await queueConfig.listener(queueConfig.queueName, itemListParams);
    if (!items.length) {
      queueConfig.sending = false;
      return;
    }
    await this.findOrCreateQueue(queueConfig);
    await this.client.sendMessageBatch({
      QueueUrl: queueConfig.queue.QueueUrl,
      Entries: items.map((entry: RequestItem, index: number) => ({
        Id: `${index + 1}`,
        MessageBody: entry.MessageBody,
        DelaySeconds: entry.DelaySeconds,
        MessageAttributes: entry.MessageAttributes,
        MessageSystemAttributes: entry.MessageSystemAttributes,
        MessageDeduplicationId: entry.MessageDeduplicationId,
        MessageGroupId: entry.MessageGroupId,
      })),
    });
    this.requestEventsToAddInQueueAsynchronous(queueConfig, nextItemListParams);
  }
}
