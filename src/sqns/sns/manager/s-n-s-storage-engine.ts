import {
  ARN,
  DeliveryPolicy,
  Encryption,
  MessageAttributes, MessageStructure,
  SubscriptionAttributes,
  SupportedProtocol,
  TopicAttributes,
  TopicTag,
} from '@sqns-client';
import { v4 as uuid } from 'uuid';
import { SQNSErrorCreator } from '../../common/auth/s-q-n-s-error-creator';
import { DeliveryPolicyHelper } from '../../common/helper/delivery-policy-helper';
import { BaseStorageEngine } from '../../common/model/base-storage-engine';
import { Publish } from '../../common/model/publish';
import { Queue } from '../../common/model/queue';
import { Subscription } from '../../common/model/subscription';
import { SubscriptionVerificationToken } from '../../common/model/subscription-verification-token';
import { Topic } from '../../common/model/topic';
import { User } from '../../common/model/user';

class SNSStorageEngine extends BaseStorageEngine {
  async createTopic(name: string, displayName: string, region: string, deliveryPolicy: DeliveryPolicy, user: User,
    attributes: TopicAttributes, tags: TopicTag): Promise<Topic> {
    const [topic] = await this._storageAdapter.findTopics({ name }, 0, 1);
    if (topic) {
      return topic;
    }
    return this._storageAdapter.createTopic(name, displayName, region, deliveryPolicy, user, attributes, tags);
  }

  async findTopicByARN(topicARN: string): Promise<Topic> {
    const topic = await this._storageAdapter.findTopicARN(topicARN);
    if (!topic) {
      SQNSErrorCreator.invalidTopic();
    }
    return topic;
  }

  findTopics(skip: number): Promise<Array<Topic>> {
    return this._storageAdapter.findTopics({}, skip, 100);
  }

  findSubscriptions(where: Record<string, unknown>, skip?: number, limit?: number): Promise<Array<Subscription>> {
    return this._storageAdapter.findSubscriptions(where, skip, limit);
  }

  totalTopics(where: Record<string, unknown>): Promise<number> {
    return this._storageAdapter.totalTopics(where);
  }

  totalSubscriptions(where: Record<string, unknown>): Promise<number> {
    return this._storageAdapter.totalSubscriptions(where);
  }

  async deleteTopic(topic: Topic): Promise<void> {
    return this._storageAdapter.deleteTopic(topic);
  }

  async removeSubscriptions(subscriptions: Array<Subscription>): Promise<void> {
    return this._storageAdapter.removeSubscriptions(subscriptions);
  }

  updateTopicAttributes(topic: Topic): Promise<void> {
    return this._storageAdapter.updateTopicAttributes(topic);
  }

  async createSubscription(user: User, topic: Topic, protocol: SupportedProtocol, endPoint: string,
    Attributes: SubscriptionAttributes = { entry: [] }): Promise<Subscription> {
    const subscription = await this.findSubscription(topic, protocol, endPoint);
    if (subscription) {
      return subscription;
    }
    const channelDeliveryPolicy = DeliveryPolicyHelper
      .verifyAndGetChannelDeliveryPolicy(Attributes.entry.find(({ key }: { key: string }) => key === 'DeliveryPolicy')?.value);
    const confirmed = ['sqs'].includes(protocol);
    return this._storageAdapter.createSubscription(user, topic, protocol, endPoint, Attributes, channelDeliveryPolicy, confirmed);
  }

  async findSubscription(topic: Topic, protocol: string, endPoint: string): Promise<Subscription> {
    const [subscription] = await this._storageAdapter.findSubscriptions({ topicARN: topic.arn, protocol, endPoint }, 0, 1);
    return subscription;
  }

  createSubscriptionVerificationToken(subscription: Subscription): Promise<SubscriptionVerificationToken> {
    const token = `${Encryption.createHash('md5', uuid() as string)}${Encryption.createHash('md5', subscription.arn)}`;
    return this._storageAdapter.createSubscriptionVerificationToken(subscription, token);
  }

  async findSubscriptionVerificationToken(token: string): Promise<SubscriptionVerificationToken> {
    const subscriptionVerificationToken = await this._storageAdapter.findSubscriptionVerificationTokenByToken(token);
    if (!subscriptionVerificationToken) {
      SQNSErrorCreator.invalidToken();
    }
    return subscriptionVerificationToken;
  }

  async findSubscriptionFromArn(subscriptionArn: string): Promise<Subscription> {
    const [subscription] = await this._storageAdapter.findSubscriptions({ arn: subscriptionArn }, 0, 1);
    if (!subscription) {
      SQNSErrorCreator.invalidSubscription();
    }
    return subscription;
  }

  async confirmSubscription(subscription: Subscription): Promise<Subscription> {
    return this._storageAdapter.confirmSubscription(subscription);
  }

  async findPublish(id: string): Promise<Publish> {
    const [publish] = await this._storageAdapter.findPublishes({ id }, 0, 1);
    if (!publish) {
      SQNSErrorCreator.invalidPublish();
    }
    return publish;
  }

  markPublished(publish: Publish): Promise<void> {
    return this._storageAdapter.markPublished(publish);
  }

  publish(topicArn: ARN, targetArn: ARN, Message: string, PhoneNumber: string, Subject: string, messageAttributes: MessageAttributes,
    messageStructure: string, MessageStructureFinal: MessageStructure): Promise<Publish> {
    return this._storageAdapter.createPublish(
      topicArn,
      targetArn,
      Message,
      PhoneNumber,
      Subject,
      messageAttributes,
      messageStructure,
      MessageStructureFinal,
      Publish.STATUS_PUBLISHING);
  }

  async findQueueByARN(queueARN: ARN): Promise<Queue> {
    const queue = await this._storageAdapter.getQueue(queueARN);
    if (!queue) {
      SQNSErrorCreator.invalidQueueName(queueARN);
    }
    return queue;
  }
}

export { SNSStorageEngine };
