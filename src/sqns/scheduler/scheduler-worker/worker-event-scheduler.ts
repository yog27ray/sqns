import * as schedule from 'node-schedule';
import { ResponseItem } from '../../../../typings/response-item';
import { DeliveryPolicy, SQNSClient, SQNSClientConfig } from '../../../client';
import { SNS_QUEUE_EVENT_TYPES, SYSTEM_QUEUE_NAME } from '../../common/helper/common';
import { DeliveryPolicyHelper } from '../../common/helper/delivery-policy-helper';
import { logger } from '../../common/logger/logger';
import { WorkerQueueConfig } from './worker-queue-config';

const log = logger.instance('WorkerEventScheduler');

class WorkerEventScheduler {
  private readonly queueNames: Array<string>;

  private sqnsClient: SQNSClient;

  private readonly queueConfigs: { [key: string]: WorkerQueueConfig };

  private job: schedule.Job;

  constructor(options: SQNSClientConfig, queueConfigs: Array<WorkerQueueConfig>, cronInterval?: string) {
    this.queueNames = [];
    this.queueConfigs = {};
    queueConfigs.forEach((each: WorkerQueueConfig) => {
      log.debug('QueueConfig: ', each.queueName, 'MaxParallel: ', each.config.MAX_COUNT);
      this.queueConfigs[each.queueName] = each.clone();
      this.queueNames.push(this.queueConfigs[each.queueName].queueName);
    });
    this.sqnsClient = new SQNSClient(options);
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
    const { Subscriptions, NextToken } = await this.sqnsClient.listSubscriptionsByTopic({ TopicArn: destinationArn, NextToken: nextToken });
    if (!Subscriptions.length) {
      await this.sqnsClient.markPublished({ MessageId: messageId });
      return 'no-subscription-found';
    }
    await Promise.all(Subscriptions.map(async ({ SubscriptionArn }) => {
      const subscription = await this.sqnsClient.getSubscription({ SubscriptionArn });
      const effectiveDeliveryPolicy = DeliveryPolicyHelper.getEffectiveChannelDeliveryPolicyForSubscription(deliveryPolicy, subscription);
      const uniqueId = `process_publish_${messageId}_subscription_${subscription.ARN}`;
      await this.sqnsClient.sendMessage({
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
      await this.sqnsClient.sendMessage({
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
    await this.sqnsClient.markPublished({ MessageId: messageId });
    return 'created-all-subscription-event';
  }

  async snsQueueEventProcessSubscription(responseItem: ResponseItem): Promise<string> {
    const subscriptionArn = responseItem.MessageAttributes.subscriptionArn.StringValue;
    const messageId = responseItem.MessageAttributes.messageId.StringValue;
    const published = await this.sqnsClient.getPublish({ MessageId: messageId });
    const subscription = await this.sqnsClient.getSubscription({ SubscriptionArn: subscriptionArn });
    switch (subscription.Protocol) {
      case 'sqs': {
        const message = await this.sqnsClient.sendMessage({
          QueueUrl: subscription.EndPoint,
          DelaySeconds: Number((published.MessageAttributes.DelaySeconds || { StringValue: '0' }).StringValue),
          MessageBody: published.Message,
          MessageAttributes: published.MessageAttributes,
          MessageDeduplicationId: `${subscription.ARN}_${subscription.Protocol}_${published.MessageId}`,
        });
        return message.MessageId;
      }
      case 'http':
      case 'https': {
        const headers = subscription.Attributes.headers ? JSON.parse(subscription.Attributes.headers) : {};
        const response = await this.sqnsClient.http(subscription.EndPoint, {
          body: JSON.stringify({
            Type: 'Notification',
            MessageId: messageId,
            TopicArn: subscription.TopicARN,
            Subject: published.Subject,
            Message: published.Message,
            SubscriptionArn: subscriptionArn,
            MessageAttributes: published.MessageAttributes,
          }),
          headers: {
            ...headers,
            'x-sqns-sns-message-id': messageId,
            'x-sqns-sns-message-type': 'Notification',
            'x-sqns-sns-topic-arn': subscription.TopicARN,
            'x-sqns-sns-subscription-arn': subscriptionArn,
          },
          jsonBody: true,
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
    this.job = schedule.scheduleJob(cronInterval, () => {
      log.info('Executing Worker Job Interval');
      const queuesNotPollingEvent = this.queueNames.filter((queueName: string) => !this.queueConfigs[queueName].polling);
      log.info('Queues to start event polling:', queuesNotPollingEvent);
      queuesNotPollingEvent.forEach((queueName: string) => this.checkIfMoreItemsCanBeProcessed(this.queueConfigs[queueName]));
    });
  }

  private checkIfMoreItemsCanBeProcessed(workerQueueConfig_: WorkerQueueConfig): void {
    const workerQueueConfig = workerQueueConfig_;
    workerQueueConfig.polling = true;
    if (workerQueueConfig.count >= workerQueueConfig.config.MAX_COUNT) {
      log.info('Queue:', workerQueueConfig.queueName, 'already maximum task running.');
      return;
    }
    while (workerQueueConfig.count < workerQueueConfig.config.MAX_COUNT && workerQueueConfig.hasMore) {
      log.info('Queue:', workerQueueConfig.queueName, 'Processing new event.');
      this.requestEventToProcessAsynchronous(workerQueueConfig);
    }
    if (!workerQueueConfig.count && !workerQueueConfig.hasMore) {
      log.info('Queue:', workerQueueConfig.queueName, 'No events to process reset status.');
      workerQueueConfig.polling = false;
      workerQueueConfig.hasMore = true;
    }
  }

  private async findOrCreateQueue(workerQueueConfig_: WorkerQueueConfig): Promise<void> {
    const workerQueueConfig = workerQueueConfig_;
    if (workerQueueConfig.queue) {
      return;
    }
    workerQueueConfig.queue = await this.sqnsClient.createQueue({ QueueName: workerQueueConfig.queueName });
  }

  private requestEventToProcessAsynchronous(workerQueueConfig: WorkerQueueConfig): void {
    workerQueueConfig.incrementCount();
    try {
      this.requestEventToProcess(workerQueueConfig)
        .then(() => {
          workerQueueConfig.decrementCount();
          this.checkIfMoreItemsCanBeProcessed(workerQueueConfig);
          return 0;
        })
        .catch((error: Error) => this.handleErrorForQueueConfig(error, workerQueueConfig));
    } catch (error) {
      this.handleErrorForQueueConfig(error as Error, workerQueueConfig);
    }
  }

  private async requestEventToProcess(workerQueueConfig_: WorkerQueueConfig): Promise<void> {
    const workerQueueConfig = workerQueueConfig_;
    await this.findOrCreateQueue(workerQueueConfig);
    const result = await this.sqnsClient.receiveMessage({ QueueUrl: workerQueueConfig.queue.QueueUrl, MessageAttributeNames: ['ALL'] });
    const { Messages: [eventItem] } = result;
    if (!eventItem) {
      workerQueueConfig.hasMore = false;
    } else {
      const [isSuccess, response] = await this.processEvent(workerQueueConfig, eventItem);
      if (isSuccess) {
        await this.sqnsClient.markEventSuccess(eventItem.MessageId, workerQueueConfig.queue.QueueUrl, response);
      } else {
        await this.sqnsClient.markEventFailure(eventItem.MessageId, workerQueueConfig.queue.QueueUrl, response);
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
      return [false, (error as Error).message];
    }
  }

  private handleErrorForQueueConfig(error: Error, _workerQueueConfig: WorkerQueueConfig): void {
    log.error(error);
    const workerQueueConfig = _workerQueueConfig;
    workerQueueConfig.hasMore = false;
    workerQueueConfig.decrementCount();
    this.checkIfMoreItemsCanBeProcessed(workerQueueConfig);
  }
}

export { WorkerEventScheduler };
