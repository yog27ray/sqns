import * as schedule from 'node-schedule';
import { ClientConfiguration, MessageAttributeEntry } from '../../../../typings';
import { DeliveryPolicy } from '../../../../typings/delivery-policy';
import { ResponseItem } from '../../../../typings/response-item';
import { SNS_QUEUE_EVENT_TYPES, SYSTEM_QUEUE_NAME } from '../../common/helper/common';
import { DeliveryPolicyHelper } from '../../common/helper/delivery-policy-helper';
import { logger } from '../../common/logger/logger';
import { SNSClient } from '../../sns/s-n-s-client';
import { SQSClient } from '../../sqs/s-q-s-client';
import { WorkerQueueConfig } from './worker-queue-config';

const log = logger.instance('WorkerEventScheduler');

class WorkerEventScheduler {
  private readonly queueNames: Array<string>;

  private sqsClient: SQSClient;

  private snsClient: SNSClient;

  private readonly queueConfigs: { [key: string]: WorkerQueueConfig };

  private job: schedule.Job;

  constructor(options: ClientConfiguration, queueNames: Array<string>, listener: (queueName: string, item: ResponseItem) => Promise<string>,
    cronInterval?: string) {
    this.queueNames = queueNames.map((each: string) => each);
    this.snsClient = new SNSClient(options);
    this.queueConfigs = Object.fromEntries(this.queueNames.map((queueName: string) => {
      const workerQueueConfig = new WorkerQueueConfig(queueName);
      workerQueueConfig.listener = listener;
      workerQueueConfig.config.MAX_COUNT = 1;
      return [queueName, workerQueueConfig];
    }));
    this.sqsClient = new SQSClient(options);
    this.initialize(cronInterval);
  }

  cancel(): void {
    this.job?.cancel();
  }

  async processSnsEvents(workerQueueConfig: WorkerQueueConfig, responseItem: ResponseItem): Promise<string> {
    const action = responseItem.MessageAttributes.action.StringValue;
    switch (action) {
      case SNS_QUEUE_EVENT_TYPES.ScanSubscriptions: {
        return this.snsQueueEventScanSubscription(workerQueueConfig, responseItem);
      }
      case SNS_QUEUE_EVENT_TYPES.ProcessSubscription: {
        return this.snsQueueEventProcessSubscription(responseItem);
      }
      default:
        throw Error(`Unhandled action: "${action}"`);
    }
  }

  async snsQueueEventScanSubscription(workerQueueConfig: WorkerQueueConfig, responseItem: ResponseItem): Promise<string> {
    const nextToken = responseItem.MessageAttributes.nextToken.StringValue;
    const destinationArn = responseItem.MessageAttributes.destinationArn.StringValue;
    const messageId = responseItem.MessageAttributes.messageId.StringValue;
    const deliveryPolicy: DeliveryPolicy = JSON.parse(responseItem.MessageAttributes.deliveryPolicy.StringValue) as DeliveryPolicy;
    const { Subscriptions, NextToken } = await this.snsClient.listSubscriptionsByTopic({ TopicArn: destinationArn, NextToken: nextToken });
    if (!Subscriptions.length) {
      await this.snsClient.markPublished({ MessageId: messageId });
      return 'no-subscription-found';
    }
    await Promise.all(Subscriptions.map(async ({ SubscriptionArn }) => {
      const subscription = await this.snsClient.getSubscription({ SubscriptionArn });
      const effectiveDeliveryPolicy = DeliveryPolicyHelper.getEffectiveChannelDeliveryPolicyForSubscription(deliveryPolicy, subscription);
      const uniqueId = `process_publish_${messageId}_subscription_${subscription.ARN}`;
      await this.sqsClient.sendMessage({
        QueueUrl: workerQueueConfig.queue.QueueUrl,
        MessageBody: uniqueId,
        MessageAttributes: {
          action: { DataType: 'String', StringValue: SNS_QUEUE_EVENT_TYPES.ProcessSubscription },
          messageId: { DataType: 'String', StringValue: messageId },
          subscriptionArn: { DataType: 'String', StringValue: subscription.ARN },
          DeliveryPolicy: { DataType: 'String', StringValue: JSON.stringify(effectiveDeliveryPolicy) },
        },
        MessageDeduplicationId: uniqueId,
      });
    }));
    if (NextToken) {
      const uniqueId = `scan_publish_${messageId}_nextToken_${NextToken}`;
      await this.sqsClient.sendMessage({
        QueueUrl: workerQueueConfig.queue.QueueUrl,
        MessageBody: uniqueId,
        MessageAttributes: {
          action: { DataType: 'String', StringValue: SNS_QUEUE_EVENT_TYPES.ScanSubscriptions },
          nextToken: { DataType: 'String', StringValue: NextToken },
          messageId: { DataType: 'String', StringValue: messageId },
          destinationArn: { DataType: 'String', StringValue: destinationArn },
          deliveryPolicy: responseItem.MessageAttributes.deliveryPolicy,
        },
        MessageDeduplicationId: uniqueId,
      });
      return 'created-new-scan-event';
    }
    await this.snsClient.markPublished({ MessageId: messageId });
    return 'created-all-subscription-event';
  }

  async snsQueueEventProcessSubscription(responseItem: ResponseItem): Promise<string> {
    const subscriptionArn = responseItem.MessageAttributes.subscriptionArn.StringValue;
    const messageId = responseItem.MessageAttributes.messageId.StringValue;
    const published = await this.snsClient.getPublish({ MessageId: messageId });
    const subscription = await this.snsClient.getSubscription({ SubscriptionArn: subscriptionArn });
    switch (subscription.Protocol) {
      case 'http':
      case 'https': {
        const MessageAttributes = {};
        published.MessageAttributes.forEach(({ Name, Value }: MessageAttributeEntry) => {
          MessageAttributes[Name] = { Type: Value.DataType, Value: Value.StringValue };
        });
        const response = await this.snsClient.post(subscription.EndPoint, {
          body: JSON.stringify({
            Type: 'Notification',
            MessageId: messageId,
            TopicArn: subscription.TopicARN,
            Subject: published.Subject,
            Message: published.Message,
            UnsubscribeURL: subscription.UnsubscribeUrl,
            SubscriptionArn: subscriptionArn,
            MessageAttributes,
          }),
          headers: {
            'x-sqns-sns-message-id': messageId,
            'x-sqns-sns-message-type': 'Notification',
            'x-sqns-sns-topic-arn': subscription.TopicARN,
            'x-sqns-sns-subscription-arn': subscriptionArn,
          },
          json: true,
        });
        return response as string;
      }
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw Error(`Unhandled Protocol: "${subscription.Protocol}"`);
    }
  }

  private initialize(cronInterval: string = '15 * * * * *'): void {
    log.info('Adding scheduler job for event slave.');
    this.job = schedule.scheduleJob(cronInterval, () => this.queueNames
      .filter((queueName: string) => !this.queueConfigs[queueName].polling)
      .forEach((queueName: string) => this.checkIfMoreItemsCanBeProcessed(this.queueConfigs[queueName])));
  }

  private checkIfMoreItemsCanBeProcessed(workerQueueConfig_: WorkerQueueConfig): void {
    const workerQueueConfig = workerQueueConfig_;
    workerQueueConfig.polling = true;
    if (workerQueueConfig.config.count >= workerQueueConfig.config.MAX_COUNT) {
      return;
    }
    while (workerQueueConfig.config.count < workerQueueConfig.config.MAX_COUNT && workerQueueConfig.hasMore) {
      this.requestEventToProcessAsynchronous(workerQueueConfig);
    }
    if (!workerQueueConfig.config.count && !workerQueueConfig.hasMore) {
      workerQueueConfig.polling = false;
      workerQueueConfig.hasMore = true;
    }
  }

  private async findOrCreateQueue(workerQueueConfig_: WorkerQueueConfig): Promise<void> {
    const workerQueueConfig = workerQueueConfig_;
    if (workerQueueConfig.queue) {
      return;
    }
    workerQueueConfig.queue = await this.sqsClient.createQueue({ QueueName: workerQueueConfig.queueName });
  }

  private requestEventToProcessAsynchronous(workerQueueConfig_: WorkerQueueConfig): void {
    const workerQueueConfig = workerQueueConfig_;
    workerQueueConfig.config.count += 1;
    this.requestEventToProcess(workerQueueConfig)
      .then(() => {
        workerQueueConfig.config.count -= 1;
        this.checkIfMoreItemsCanBeProcessed(workerQueueConfig);
        return 0;
      })
      .catch((error: Error) => {
        workerQueueConfig.config.count -= 1;
        log.error(error);
        workerQueueConfig.hasMore = false;
      });
  }

  private async requestEventToProcess(workerQueueConfig_: WorkerQueueConfig): Promise<void> {
    const workerQueueConfig = workerQueueConfig_;
    await this.findOrCreateQueue(workerQueueConfig);
    const result = await this.sqsClient.receiveMessage({ QueueUrl: workerQueueConfig.queue.QueueUrl, MessageAttributeNames: ['ALL'] });
    const { Messages: [eventItem] } = result;
    if (!eventItem) {
      workerQueueConfig.hasMore = false;
    } else {
      const [isSuccess, response] = await this.processEvent(workerQueueConfig, eventItem);
      if (isSuccess) {
        await this.sqsClient.markEventSuccess(eventItem.MessageId, workerQueueConfig.queue.QueueUrl, response);
      } else {
        await this.sqsClient.markEventFailure(eventItem.MessageId, workerQueueConfig.queue.QueueUrl, response);
      }
    }
  }

  private async processEvent(workerQueueConfig: WorkerQueueConfig, responseItem: ResponseItem): Promise<[boolean, string]> {
    try {
      let response: string;
      switch (workerQueueConfig.queueName) {
        case SYSTEM_QUEUE_NAME.SNS: {
          response = await this.processSnsEvents(workerQueueConfig, responseItem);
          break;
        }
        default:
          response = await workerQueueConfig.listener(workerQueueConfig.queueName, responseItem);
      }
      return [true, response];
    } catch (error) {
      log.error(error);
      return [false, error.message];
    }
  }
}

export { WorkerEventScheduler };
