import {
  AccessKey,
  ARN,
  ChannelDeliveryPolicy,
  DeliveryPolicy,
  EventItem, MessageAttributes,
  MessageStructure, SubscriptionAttributes,
  SupportedProtocol, TopicAttributes,
  TopicTag,
} from '../../../client';
import { Publish } from '../model/publish';
import { Queue } from '../model/queue';
import { Subscription } from '../model/subscription';
import { SubscriptionVerificationToken } from '../model/subscription-verification-token';
import { Topic } from '../model/topic';
import { User } from '../model/user';

interface StorageAdapter {
  getDBTableName(tableName: string): string;
  createUser(organizationId: string): Promise<User>;
  accessKey(accessKey: string, secretAccessKey: string, userId: string): Promise<AccessKey>;
  updateAccessKey(accessKey: AccessKey): Promise<AccessKey>;
  findAccessKeys(where: Record<string, unknown>, skip?: number, limit?: number): Promise<Array<AccessKey>>;
  findUsers(where: Record<string, unknown>, skip?: number, limit?: number): Promise<Array<User>>;
  addEventItem(queue: Queue, item: EventItem): Promise<EventItem>;
  findByIdForQueue(queue: Queue, id: string): Promise<EventItem>;
  findByDeduplicationIdForQueue(queue: Queue, id: string): Promise<EventItem>;
  findById(id: string): Promise<EventItem>;
  findEventsToProcess(time: Date, limit: number): Promise<Array<EventItem>>;
  updateEvent(id: string, data: Record<string, unknown>): Promise<void>;
  getQueues(queueARNPrefix?: ARN): Promise<Array<Queue>>;
  createQueue(
    user: User, queueName: string, region: string, attributes: Record<string, string>, tag: Record<string, string>): Promise<Queue>;
  getQueue(queueName: ARN): Promise<Queue>;
  deleteQueue(queue: Queue): Promise<void>;
  createTopic(name: string, displayName: string, region: string, deliveryPolicy: DeliveryPolicy, user: User, attributes: TopicAttributes,
    tags: TopicTag): Promise<Topic>;
  findTopicARN(topicARN: ARN): Promise<Topic>;
  findTopics(where: Record<string, unknown>, skip?: number, limit?: number): Promise<Array<Topic>>;
  totalTopics(where: { [p: string]: unknown }): Promise<number>;
  deleteTopic(topic: Topic): Promise<void>;
  removeSubscriptions(subscriptions: Array<Subscription>): Promise<void>;
  updateTopicAttributes(topic: Topic): Promise<void>;
  createSubscription(user: User, topic: Topic, protocol: SupportedProtocol, endPoint: string, Attributes: SubscriptionAttributes,
    deliveryPolicy: ChannelDeliveryPolicy, confirmed: boolean): Promise<Subscription>;
  totalSubscriptions(where: Record<string, unknown>): Promise<number>;
  findSubscriptions(where: Record<string, unknown>, skip?: number, limit?: number): Promise<Array<Subscription>>;
  createSubscriptionVerificationToken(subscription: Subscription, token: string): Promise<SubscriptionVerificationToken>;
  findSubscriptionVerificationTokenByToken(token: unknown): Promise<SubscriptionVerificationToken>;
  confirmSubscription(subscription: Subscription): Promise<Subscription>;
  markPublished(publish: Publish): Promise<void>;
  createPublish(topicArn: ARN, targetArn: ARN, Message: string, PhoneNumber: string, Subject: string, messageAttributes: MessageAttributes
    , messageStructure: string, MessageStructureFinal: MessageStructure, status: string): Promise<Publish>;
  findPublishes(where: Record<string, unknown>, skip?: number, limit?: number): Promise<Array<Publish>>;
  incrementReceiveCountWithSentTime(eventItem: EventItem, date: Date): Promise<EventItem>;
}

export { StorageAdapter };
