import { ARN, MessageAttributes, MessageStructure, SupportedProtocol } from '../../../../typings';
import { TopicAttributes, TopicTag } from '../../../../typings/class-types';
import { KeyValueString } from '../../../../typings/common';
import { ChannelDeliveryPolicy, DeliveryPolicy } from '../../../../typings/delivery-policy';
import { SubscriptionAttributes } from '../../../../typings/subscription';
import { AccessKey } from '../model/access-key';
import { EventItem } from '../model/event-item';
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
  findAccessKeys(where: { [key: string]: unknown }, skip?: number, limit?: number): Promise<Array<AccessKey>>;
  findUsers(where: { [key: string]: unknown }, skip?: number, limit?: number): Promise<Array<User>>;
  addEventItem(queue: Queue, item: EventItem): Promise<EventItem>;
  findById(id: string): Promise<EventItem>;
  findEventsToProcess(queues: Array<Queue>, time: Date, limit: number): Promise<Array<EventItem>>;
  updateEvent(id: string, data: { [key: string]: any }): Promise<void>;
  getQueues(queueARNPrefix?: ARN): Promise<Array<Queue>>;
  createQueue(user: User, queueName: string, region: string, attributes: KeyValueString, tag: KeyValueString): Promise<Queue>;
  getQueue(queueName: ARN): Promise<Queue>;
  deleteQueue(queue: Queue): Promise<void>;
  createTopic(name: string, displayName: string, region: string, deliveryPolicy: DeliveryPolicy, user: User, attributes: TopicAttributes,
    tags: TopicTag): Promise<Topic>;
  findTopicARN(topicARN: ARN): Promise<Topic>;
  findTopics(where: { [key: string]: unknown }, skip?: number, limit?: number): Promise<Array<Topic>>;
  totalTopics(where: { [p: string]: unknown }): Promise<number>;
  deleteTopic(topic: Topic): Promise<void>;
  removeSubscriptions(subscriptions: Array<Subscription>): Promise<void>;
  updateTopicAttributes(topic: Topic): Promise<void>;
  createSubscription(user: User, topic: Topic, protocol: SupportedProtocol, endPoint: string, Attributes: SubscriptionAttributes,
    deliveryPolicy: ChannelDeliveryPolicy): Promise<Subscription>;
  totalSubscriptions(where: { [key: string]: unknown }): Promise<number>;
  findSubscriptions(where: { [key: string]: unknown }, skip?: number, limit?: number): Promise<Array<Subscription>>;
  createSubscriptionVerificationToken(subscription: Subscription, token: string): Promise<SubscriptionVerificationToken>;
  findSubscriptionVerificationTokenByToken(token: any): Promise<SubscriptionVerificationToken>;
  confirmSubscription(subscription: Subscription): Promise<Subscription>;
  markPublished(publish: Publish): Promise<void>;
  createPublish(topicArn: ARN, targetArn: ARN, Message: string, PhoneNumber: string, Subject: string, messageAttributes: MessageAttributes
    , messageStructure: string, MessageStructureFinal: MessageStructure, status: string): Promise<Publish>;
  findPublishes(where: { [key: string]: unknown }, skip?: number, limit?: number): Promise<Array<Publish>>;
}

export { StorageAdapter };
