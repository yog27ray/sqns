import { ARN, MessageAttributes, MessageStructure, SupportedProtocol } from '../../../../../typings/typings';
import { TopicAttributes, TopicTag } from '../../../../../typings/class-types';
import { KeyValueString } from '../../../../../typings/common';
import { MongoDBConfig } from '../../../../../typings/config';
import { ChannelDeliveryPolicy, DeliveryPolicy } from '../../../../../typings/delivery-policy';
import { SubscriptionAttributes } from '../../../../../typings/subscription';
import { AccessKey } from '../../model/access-key';
import { EventItem } from '../../model/event-item';
import { Publish } from '../../model/publish';
import { Queue } from '../../model/queue';
import { Subscription } from '../../model/subscription';
import { SubscriptionVerificationToken } from '../../model/subscription-verification-token';
import { Topic } from '../../model/topic';
import { User } from '../../model/user';
import { StorageAdapter } from '../storage-adapter';
declare class MongoDBAdapter implements StorageAdapter {
    private static readonly QUEUE_TABLE_PREFIX;
    private static readonly Table;
    private readonly connection;
    private static dbToSystemItem;
    private static getTableName;
    getDBTableName(tableName: string): string;
    constructor(config: MongoDBConfig);
    addEventItem(queue: Queue, eventItem: EventItem): Promise<EventItem>;
    findEventsToProcess(queues: Array<Queue>, time: Date, limit: number): Promise<Array<EventItem>>;
    getQueues(queueARNPrefix: string): Promise<Array<Queue>>;
    updateEvent(id: string, data: {
        [key: string]: any;
    }): Promise<any>;
    findById(id: string): Promise<EventItem>;
    createQueue(user: User, queueName: string, region: string, attributes: KeyValueString, tags: KeyValueString): Promise<Queue>;
    getQueue(queueArn: ARN): Promise<Queue>;
    deleteQueue(queue: Queue): Promise<void>;
    confirmSubscription(subscription_: Subscription): Promise<Subscription>;
    createPublish(topicArn: ARN, targetArn: ARN, Message: string, PhoneNumber: string, Subject: string, messageAttributes: MessageAttributes, messageStructure: string, MessageStructureFinal: MessageStructure, status: string): Promise<Publish>;
    createSubscription(user: User, topic: Topic, protocol: SupportedProtocol, endPoint: string, Attributes: SubscriptionAttributes, deliveryPolicy: ChannelDeliveryPolicy): Promise<Subscription>;
    createSubscriptionVerificationToken(subscription: Subscription, token: string): Promise<SubscriptionVerificationToken>;
    findSubscriptionVerificationTokenByToken(token: string): Promise<SubscriptionVerificationToken>;
    createTopic(name: string, displayName: string, region: string, deliveryPolicy: DeliveryPolicy, user: User, attributes: TopicAttributes, tags: TopicTag): Promise<Topic>;
    deleteTopic(topic: Topic): Promise<void>;
    findPublishes(query: {
        [p: string]: unknown;
    }, skip?: number, limit?: number): Promise<Array<Publish>>;
    findSubscriptions(where: {
        [p: string]: unknown;
    }, skip?: number, limit?: number): Promise<Array<Subscription>>;
    findTopicARN(arn: ARN): Promise<Topic>;
    findTopics(where: {
        [p: string]: unknown;
    }, skip?: number, limit?: number): Promise<Array<Topic>>;
    markPublished(publish_: Publish): Promise<void>;
    removeSubscriptions(subscriptions: Array<Subscription>): Promise<void>;
    totalSubscriptions(where: {
        [p: string]: unknown;
    }): Promise<number>;
    totalTopics(where: {
        [p: string]: unknown;
    }): Promise<number>;
    updateTopicAttributes(topic: Topic): Promise<void>;
    findAccessKeys(where: {
        [p: string]: unknown;
    }, skip?: number, limit?: number): Promise<Array<AccessKey>>;
    findUsers(where: {
        [p: string]: unknown;
    }, skip?: number, limit?: number): Promise<Array<User>>;
    accessKey(accessKey: string, secretKey: string, userId: string): Promise<AccessKey>;
    createUser(organizationId: string): Promise<User>;
    updateAccessKey(accessKey: AccessKey): Promise<AccessKey>;
}
export { MongoDBAdapter };
