import { v4 as uuid } from 'uuid';
import { TopicAttributes, TopicTag } from '../../../../typings/class-types';
import { DeliveryPolicy } from '../../../../typings/delivery-policy';
import { SubscriptionAttributes } from '../../../../typings/subscription';
import { ARN, MessageAttributes, MessageStructure, SupportedProtocol } from '../../../../typings/typings';
import { Encryption } from '../../common/auth/encryption';
import { SQNSError } from '../../common/auth/s-q-n-s-error';
import { DeliveryPolicyHelper } from '../../common/helper/delivery-policy-helper';
import { BaseStorageEngine } from '../../common/model/base-storage-engine';
import { Publish } from '../../common/model/publish';
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
      SQNSError.invalidTopic();
    }
    return topic;
  }

  findTopics(skip: number): Promise<Array<Topic>> {
    return this._storageAdapter.findTopics({}, skip, 100);
  }

  findSubscriptions(where: { [key: string]: unknown }, skip?: number, limit?: number): Promise<Array<Subscription>> {
    return this._storageAdapter.findSubscriptions(where, skip, limit);
  }

  totalTopics(where: { [key: string]: unknown }): Promise<number> {
    return this._storageAdapter.totalTopics(where);
  }

  totalSubscriptions(where: { [key: string]: unknown }): Promise<number> {
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
    Attributes: SubscriptionAttributes): Promise<Subscription> {
    const subscription = await this.findSubscription(topic, protocol, endPoint);
    if (subscription) {
      return subscription;
    }
    const channelDeliveryPolicy = DeliveryPolicyHelper
      .verifyAndGetChannelDeliveryPolicy(Attributes.entry.find(({ key }: { key: string }) => key === 'DeliveryPolicy')?.value);
    return this._storageAdapter.createSubscription(user, topic, protocol, endPoint, Attributes, channelDeliveryPolicy);
  }

  async findSubscription(topic: Topic, protocol: string, endPoint: string): Promise<Subscription> {
    const [subscription] = await this._storageAdapter.findSubscriptions({ topicARN: topic.arn, protocol, endPoint }, 0, 1);
    return subscription;
  }

  createSubscriptionVerificationToken(subscription: Subscription): Promise<SubscriptionVerificationToken> {
    const token = `${Encryption.createHash('md5', uuid())}${Encryption.createHash('md5', subscription.arn)}`;
    return this._storageAdapter.createSubscriptionVerificationToken(subscription, token);
  }

  async findSubscriptionVerificationToken(token: string): Promise<SubscriptionVerificationToken> {
    const subscriptionVerificationToken = await this._storageAdapter.findSubscriptionVerificationTokenByToken(token);
    if (!subscriptionVerificationToken) {
      SQNSError.invalidToken();
    }
    return subscriptionVerificationToken;
  }

  async findSubscriptionFromArn(subscriptionArn: string): Promise<Subscription> {
    const [subscription] = await this._storageAdapter.findSubscriptions({ arn: subscriptionArn }, 0, 1);
    if (!subscription) {
      SQNSError.invalidSubscription();
    }
    return subscription;
  }

  async confirmSubscription(subscription: Subscription): Promise<Subscription> {
    return this._storageAdapter.confirmSubscription(subscription);
  }

  async findPublish(id: string): Promise<Publish> {
    const [publish] = await this._storageAdapter.findPublishes({ id }, 0, 1);
    if (!publish) {
      SQNSError.invalidPublish();
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
}

export { SNSStorageEngine };
