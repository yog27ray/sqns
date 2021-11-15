import { TopicAttributes, TopicTag } from '../../../../typings/class-types';
import { SQNSClientConfig } from '../../../../typings/client-confriguation';
import { SNSConfig } from '../../../../typings/config';
import { DeliveryPolicy } from '../../../../typings/delivery-policy';
import { SubscriptionAttributes } from '../../../../typings/subscription';
import {
  ARN,
  MessageAttributes,
  MessageStructure,
  SubscriptionConfirmationRequestBody,
  SupportedProtocol,
  SUPPORTED_CHANNEL_TYPE,
} from '../../../../typings/typings';
import { Encryption } from '../../common/auth/encryption';
import { SQNSError } from '../../common/auth/s-q-n-s-error';
import { ARNHelper } from '../../common/helper/a-r-n-helper';
import { SNS_QUEUE_EVENT_TYPES, SUPPORTED_CHANNEL, SUPPORTED_PROTOCOL, SYSTEM_QUEUE_NAME } from '../../common/helper/common';
import { logger } from '../../common/logger/logger';
import { BaseManager } from '../../common/model/base-manager';
import { BaseStorageEngine } from '../../common/model/base-storage-engine';
import { Publish } from '../../common/model/publish';
import { Subscription } from '../../common/model/subscription';
import { SubscriptionVerificationToken } from '../../common/model/subscription-verification-token';
import { Topic } from '../../common/model/topic';
import { User } from '../../common/model/user';
import { RequestClient } from '../../common/request-client/request-client';
import { SQNSClient } from '../../s-q-n-s-client';
import { WorkerEventScheduler } from '../../scheduler/scheduler-worker/worker-event-scheduler';
import { WorkerQueueConfig } from '../../scheduler/scheduler-worker/worker-queue-config';
import { SNSStorageEngine } from './s-n-s-storage-engine';

const log = logger.instance('SNSManager');

class SNSManager extends BaseManager {
  private requestClient = new RequestClient();

  private readonly sNSStorageEngine: SNSStorageEngine;

  private sqnsClient: SQNSClient;

  private readonly workerEventScheduler: WorkerEventScheduler;

  constructor(snsConfig: SNSConfig) {
    super();
    const sqnsClientConfig: SQNSClientConfig = {
      endpoint: snsConfig.queueEndpoint || snsConfig.endpoint,
      accessKeyId: snsConfig.queueAccessKey,
      secretAccessKey: snsConfig.queueSecretAccessKey,
    };
    this.sNSStorageEngine = new SNSStorageEngine(snsConfig.db);
    this.sqnsClient = new SQNSClient(sqnsClientConfig);
    if (!snsConfig.disableWorker) {
      const workerQueueConfig = new WorkerQueueConfig(SYSTEM_QUEUE_NAME.SNS, undefined);
      this.workerEventScheduler = new WorkerEventScheduler(sqnsClientConfig, [workerQueueConfig], undefined);
    }
  }

  createTopic(name: string, displayName: string, region: string, deliveryPolicy: DeliveryPolicy, user: User,
    attributes: TopicAttributes = { entry: [] }, tags: TopicTag = { member: [] }): Promise<Topic> {
    return this.sNSStorageEngine.createTopic(name, displayName, region, deliveryPolicy, user, attributes, tags);
  }

  findTopicByARN(topicARN: string): Promise<Topic> {
    return this.sNSStorageEngine.findTopicByARN(topicARN);
  }

  findTopics(skip: number): Promise<Array<Topic>> {
    return this.sNSStorageEngine.findTopics(skip);
  }

  findSubscriptions(where: { [key: string]: unknown }, skip?: number, limit?: number): Promise<Array<Subscription>> {
    return this.sNSStorageEngine.findSubscriptions(where, skip, limit);
  }

  totalTopics(where: { [key: string]: unknown } = {}): Promise<number> {
    return this.sNSStorageEngine.totalTopics(where);
  }

  totalSubscriptions(where: { [key: string]: unknown } = {}): Promise<number> {
    return this.sNSStorageEngine.totalSubscriptions(where);
  }

  deleteTopic(topic: Topic): Promise<void> {
    return this.sNSStorageEngine.deleteTopic(topic);
  }

  removeSubscriptions(subscriptions: Array<Subscription>): Promise<void> {
    return this.sNSStorageEngine.removeSubscriptions(subscriptions);
  }

  updateTopicAttributes(topic: Topic): Promise<void> {
    return this.sNSStorageEngine.updateTopicAttributes(topic);
  }

  async publish(topicArn: ARN, targetArn: ARN, Message: string, PhoneNumber: string, Subject: string,
    messageAttributes: MessageAttributes, messageStructure: string): Promise<Publish> {
    const published = await this.sNSStorageEngine.publish(topicArn,
      targetArn,
      Message,
      PhoneNumber,
      Subject,
      messageAttributes,
      messageStructure,
      this.generatePublishMessageStructure(messageStructure, Message));
    const deliveryPolicy = await this.findDeliveryPolicyOfArn(published.destinationArn);
    const queue = await this.sqnsClient.createQueue({ QueueName: SYSTEM_QUEUE_NAME.SNS });
    await this.sqnsClient.sendMessage({
      QueueUrl: queue.QueueUrl,
      MessageBody: `scan_publish_${published.id}`,
      MessageAttributes: {
        action: { DataType: 'String', StringValue: SNS_QUEUE_EVENT_TYPES.ScanSubscriptions },
        nextToken: { DataType: 'String', StringValue: Encryption.encodeNextToken({ skip: 0 }) },
        messageId: { DataType: 'String', StringValue: published.id },
        destinationArn: { DataType: 'String', StringValue: published.destinationArn },
        deliveryPolicy: { DataType: 'String', StringValue: JSON.stringify(deliveryPolicy) },
      },
      MessageDeduplicationId: `sqns_sns_publish_${published.id}`,
    });
    return published;
  }

  async findDeliveryPolicyOfArn(destinationArn: ARN): Promise<DeliveryPolicy> {
    const arnResource = ARNHelper.findResourceClassOfARN(destinationArn);
    switch (arnResource) {
      case 'Topic': {
        const topic = await this.findTopicByARN(destinationArn);
        return topic.deliveryPolicy;
      }
      default:
        throw new SQNSError({
          code: 'InvalidResourceARN',
          message: 'Invalid Resource ARN',
        });
    }
  }

  generatePublishMessageStructure(messageStructure_: string, message: string): MessageStructure {
    let messageStructureString = messageStructure_;
    if (!messageStructureString) {
      messageStructureString = '{}';
    }
    const messageStructure: MessageStructure = JSON.parse(messageStructureString);
    Object.keys(messageStructure).forEach((key: SUPPORTED_CHANNEL_TYPE) => {
      if (!SUPPORTED_CHANNEL.includes(key)) {
        throw new SQNSError({ code: '412', message: `"${key}" is not supported channel.` });
      }
      if (typeof messageStructure[key] !== 'string') {
        throw new SQNSError({ code: '412', message: `"${key}" value "${messageStructure[key]}" is not string.` });
      }
    });
    messageStructure.default = messageStructure.default || message;
    return messageStructure;
  }

  async subscribe(user: User, topic: Topic, protocol: SupportedProtocol, endPoint: string, Attributes: SubscriptionAttributes)
    : Promise<Subscription> {
    if (!SUPPORTED_PROTOCOL.includes(protocol)) {
      SQNSError.invalidSubscriptionProtocol(protocol);
    }
    const subscription = await this.sNSStorageEngine.findSubscription(topic, protocol, endPoint);
    if (subscription) {
      return subscription;
    }
    return this.sNSStorageEngine.createSubscription(user, topic, protocol, endPoint, Attributes);
  }

  requestSubscriptionConfirmation(subscription: Subscription, serverURL: string): void {
    if (subscription.confirmed) {
      return;
    }
    this.sNSStorageEngine.createSubscriptionVerificationToken(subscription)
      .then((subscriptionVerificationToken: SubscriptionVerificationToken) => {
        const requestBody: SubscriptionConfirmationRequestBody = {
          Type: subscriptionVerificationToken.Type,
          MessageId: subscriptionVerificationToken.id,
          Token: subscriptionVerificationToken.token,
          TopicArn: subscriptionVerificationToken.TopicArn,
          Message: `You have chosen to subscribe to the topic ${subscription.topicARN}.\n`
            + 'To confirm the subscription, visit the SubscribeURL included in this message.',
          SubscribeURL: subscriptionVerificationToken.getSubscribeURL(serverURL),
          Timestamp: subscriptionVerificationToken.createdAt.toISOString(),
        };
        const headers = {
          'Content-Type': 'application/json',
          'x-sqns-sns-message-id': subscriptionVerificationToken.id,
          'x-sqns-sns-message-type': subscriptionVerificationToken.Type,
          'x-sqns-sns-topic-arn': subscriptionVerificationToken.TopicArn,
        };
        return this.requestClient.post(subscription.endPoint, { body: JSON.stringify(requestBody), headers, json: true });
      })
      .catch((error: Error) => {
        log.error(error);
      });
  }

  findSubscriptionVerificationToken(token: string): Promise<SubscriptionVerificationToken> {
    return this.sNSStorageEngine.findSubscriptionVerificationToken(token);
  }

  findSubscriptionFromArn(subscriptionArn: string): Promise<Subscription> {
    return this.sNSStorageEngine.findSubscriptionFromArn(subscriptionArn);
  }

  confirmSubscription(subscription: Subscription): Promise<Subscription> {
    return this.sNSStorageEngine.confirmSubscription(subscription);
  }

  findPublishById(id: string): Promise<Publish> {
    return this.sNSStorageEngine.findPublish(id);
  }

  markPublished(publish: Publish): Promise<void> {
    return this.sNSStorageEngine.markPublished(publish);
  }

  getStorageEngine(): BaseStorageEngine {
    return this.sNSStorageEngine;
  }

  cancel(): void {
    this.workerEventScheduler?.cancel();
  }
}

export { SNSManager };
