import { v4 as uuid } from 'uuid';
import { ARN, MessageAttributes, MessageStructure, SupportedProtocol } from '../../../../../typings';
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
import { MongoDBConnection } from './mongo-d-b-connection';

class MongoDBAdapter implements StorageAdapter {
  private static readonly QUEUE_TABLE_PREFIX = '_Queue_';

  private static readonly Table: {
    Event: string;
    Queue: string;
    Topic: string;
    AccessKey: string;
    User: string;
    Subscription: string;
    SubscriptionVerificationToken: string;
    Publish: string;
  } = {
    AccessKey: MongoDBAdapter.getTableName('AccessKey'),
    User: MongoDBAdapter.getTableName('User'),
    Event: MongoDBAdapter.getTableName('Event'),
    Queue: MongoDBAdapter.getTableName('Queues'),
    Topic: MongoDBAdapter.getTableName('Topic'),
    Subscription: MongoDBAdapter.getTableName('Subscription'),
    SubscriptionVerificationToken: MongoDBAdapter.getTableName('SubscriptionVerificationToken'),
    Publish: MongoDBAdapter.getTableName('Publish'),
  };

  private readonly connection: MongoDBConnection;

  private static dbToSystemItem(row: { [key: string]: any, id?: string }): any {
    const document = { ...row };
    document.id = document._id as string;
    delete document._id;
    return document;
  }

  private static getTableName(queueName: string): string {
    return `${MongoDBAdapter.QUEUE_TABLE_PREFIX}${queueName}`;
  }

  constructor(config: MongoDBConfig) {
    const option = { ...config };
    if (!option.uri) {
      throw Error('Database URI is missing');
    }
    const { uri }: { uri?: string } = option;
    delete option.uri;
    this.connection = new MongoDBConnection(uri, option);
  }

  async addEventItem(queue: Queue, eventItem: EventItem): Promise<EventItem> {
    const mongoDocument = eventItem.toJSON();
    mongoDocument._id = mongoDocument.id || uuid();
    delete mongoDocument.id;
    try {
      await this.connection.insert(MongoDBAdapter.Table.Event, mongoDocument);
    } catch (error) {
      if (error.code !== 11000) {
        await Promise.reject(error);
      }
    }
    const insertedMongoDocument = await this.connection.findOne(MongoDBAdapter.Table.Event, { _id: mongoDocument._id });
    if (!insertedMongoDocument) {
      return undefined;
    }
    return new EventItem(MongoDBAdapter.dbToSystemItem(insertedMongoDocument));
  }

  async findEventsToProcess(queues: Array<Queue>, time: Date, limit: number): Promise<Array<EventItem>> {
    const mongoDocuments = await this.connection.find(
      MongoDBAdapter.Table.Event,
      {
        queueARN: { $in: queues.map((queue: Queue) => queue.arn) },
        eventTime: { $lt: time },
        state: { $in: [EventItem.State.PENDING, EventItem.State.PROCESSING, EventItem.State.FAILURE] },
        $expr: { $lt: ['$receiveCount', '$maxReceiveCount'] },
      },
      { eventTime: -1 },
      { limit });
    return mongoDocuments.map((mongoDocument: any) => new EventItem(MongoDBAdapter.dbToSystemItem(mongoDocument)));
  }

  async getQueues(queueARNPrefix: string): Promise<Array<Queue>> {
    const query: { arn?: unknown } = {};
    if (queueARNPrefix) {
      query.arn = { $regex: `^${queueARNPrefix}` };
    }
    const queues = await this.connection.find(MongoDBAdapter.Table.Queue, query, { createdAt: 1 });
    return queues.map((queue: any) => new Queue(MongoDBAdapter.dbToSystemItem(queue)));
  }

  async updateEvent(id: string, data: { [key: string]: any }): Promise<any> {
    await this.connection.update(MongoDBAdapter.Table.Event, id, data);
  }

  async findById(id: string): Promise<EventItem> {
    const event = await this.connection.findOne(MongoDBAdapter.Table.Event, { _id: id });
    if (!event) {
      return undefined;
    }
    return new EventItem(MongoDBAdapter.dbToSystemItem(event));
  }

  async createQueue(user: User, queueName: string, region: string, attributes: KeyValueString, tags: KeyValueString): Promise<Queue> {
    let queue = await this.getQueue(Queue.arn(user.organizationId, region, queueName));
    if (!queue) {
      queue = new Queue({
        id: uuid(),
        attributes,
        name: queueName,
        tags,
        ownerId: user?.id,
        companyId: user?.organizationId,
        region,
      });
      await this.connection.insert(MongoDBAdapter.Table.Queue, queue.toJSON());
    }
    return queue;
  }

  async getQueue(queueArn: ARN): Promise<Queue> {
    const dbQueue = await this.connection.findOne(MongoDBAdapter.Table.Queue, { arn: queueArn });
    if (!dbQueue) {
      return undefined;
    }
    return new Queue(MongoDBAdapter.dbToSystemItem(dbQueue));
  }

  async deleteQueue(queue: Queue): Promise<void> {
    await this.connection.deleteOne(MongoDBAdapter.Table.Queue, { _id: queue.id });
    await this.connection.deleteMany(MongoDBAdapter.Table.Event, { queueId: queue.id });
  }

  async confirmSubscription(subscription_: Subscription): Promise<Subscription> {
    const subscription = subscription_;
    await this.connection.update(MongoDBAdapter.Table.Subscription, subscription.id, { confirmed: true });
    subscription.confirmed = true;
    return subscription;
  }

  async createPublish(topicArn: ARN, targetArn: ARN, Message: string, PhoneNumber: string, Subject: string,
    messageAttributes: MessageAttributes, messageStructure: string, MessageStructureFinal: MessageStructure, status: string)
    : Promise<Publish> {
    const publish = new Publish({
      id: uuid(),
      topicArn,
      targetArn,
      Message,
      PhoneNumber,
      Subject,
      MessageAttributes: messageAttributes,
      MessageStructure: messageStructure,
      MessageStructureFinal,
      Status: status,
    });
    await this.connection.insert(MongoDBAdapter.Table.Publish, publish.toJSON());
    return publish;
  }

  async createSubscription(user: User, topic: Topic, protocol: SupportedProtocol, endPoint: string, Attributes: SubscriptionAttributes,
    deliveryPolicy: ChannelDeliveryPolicy): Promise<Subscription> {
    const subscription = new Subscription({
      id: uuid(),
      companyId: user.organizationId,
      protocol,
      endPoint,
      Attributes,
      topicARN: topic.arn,
      region: topic.region,
      confirmed: false,
      DeliveryPolicy: deliveryPolicy,
    });
    await this.connection.insert(MongoDBAdapter.Table.Subscription, subscription.toJSON());
    return subscription;
  }

  async createSubscriptionVerificationToken(subscription: Subscription, token: string): Promise<SubscriptionVerificationToken> {
    const subscriptionVerificationToken = new SubscriptionVerificationToken({
      id: uuid(),
      token,
      SubscriptionArn: subscription.arn,
      TopicArn: subscription.topicARN,
      Type: 'SubscriptionConfirmation',
    });
    await this.connection.insert(MongoDBAdapter.Table.SubscriptionVerificationToken, subscriptionVerificationToken.toJSON());
    return subscriptionVerificationToken;
  }

  async findSubscriptionVerificationTokenByToken(token: string): Promise<SubscriptionVerificationToken> {
    const subscriptionVerificationToken = await this.connection.findOne(MongoDBAdapter.Table.SubscriptionVerificationToken, { token });
    if (!subscriptionVerificationToken) {
      return undefined;
    }
    return new SubscriptionVerificationToken(MongoDBAdapter.dbToSystemItem(subscriptionVerificationToken));
  }

  async createTopic(name: string, displayName: string, region: string, deliveryPolicy: DeliveryPolicy, user: User,
    attributes: TopicAttributes, tags: TopicTag): Promise<Topic> {
    const topic = new Topic({
      id: uuid(),
      companyId: user.organizationId,
      name,
      region,
      displayName,
      deliveryPolicy,
      tags,
      attributes,
    });
    await this.connection.insert(MongoDBAdapter.Table.Topic, topic.toJSON());
    return topic;
  }

  async deleteTopic(topic: Topic): Promise<void> {
    await this.connection.deleteOne(MongoDBAdapter.Table.Topic, { _id: topic.id });
  }

  async findPublishes(query: { [p: string]: unknown }, skip?: number, limit?: number): Promise<Array<Publish>> {
    const publishes = await this.connection.find(MongoDBAdapter.Table.Publish, query, { createdAt: 1 }, { skip, limit });
    return publishes.map((publish: unknown) => new Publish(MongoDBAdapter.dbToSystemItem(publish)));
  }

  async findSubscriptions(where: { [p: string]: unknown }, skip?: number, limit?: number): Promise<Array<Subscription>> {
    const subscriptions = await this.connection.find(MongoDBAdapter.Table.Subscription, where, { createdAt: 1 }, { skip, limit });
    return subscriptions.map((subscription: unknown) => new Subscription(MongoDBAdapter.dbToSystemItem(subscription)));
  }

  async findTopicARN(arn: ARN): Promise<Topic> {
    const topic = await this.connection.findOne(MongoDBAdapter.Table.Topic, { arn });
    if (!topic) {
      return undefined;
    }
    return new Topic(MongoDBAdapter.dbToSystemItem(topic));
  }

  async findTopics(where: { [p: string]: unknown }, skip?: number, limit?: number): Promise<Array<Topic>> {
    const topics = await this.connection.find(MongoDBAdapter.Table.Topic, where, { createdAt: 1 }, { skip, limit });
    return topics.map((topic: unknown) => new Topic(MongoDBAdapter.dbToSystemItem(topic)));
  }

  async markPublished(publish_: Publish): Promise<void> {
    const publish = publish_;
    await this.connection.update(MongoDBAdapter.Table.Publish, publish.id, { Status: Publish.STATUS_PUBLISHED });
    publish.Status = Publish.STATUS_PUBLISHED;
  }

  async removeSubscriptions(subscriptions: Array<Subscription>): Promise<void> {
    await this.connection.deleteMany(MongoDBAdapter.Table.Subscription, {
      _id: { $in: subscriptions.map((subscription: Subscription) => subscription.id) },
    });
  }

  totalSubscriptions(where: { [p: string]: unknown }): Promise<number> {
    return this.connection.count(MongoDBAdapter.Table.Subscription, where);
  }

  totalTopics(where: { [p: string]: unknown }): Promise<number> {
    return this.connection.count(MongoDBAdapter.Table.Topic, where);
  }

  async updateTopicAttributes(topic: Topic): Promise<void> {
    await this.connection.update(MongoDBAdapter.Table.Topic, topic.id, { attributes: topic.attributes });
  }

  async findAccessKeys(where: { [p: string]: unknown }, skip?: number, limit?: number): Promise<Array<AccessKey>> {
    const accessKeys = await this.connection.find(MongoDBAdapter.Table.AccessKey, where, { createdAt: 1 }, { skip, limit });
    return accessKeys.map((accessKey: unknown) => new AccessKey(MongoDBAdapter.dbToSystemItem(accessKey)));
  }

  async findUsers(where: { [p: string]: unknown }, skip?: number, limit?: number): Promise<Array<User>> {
    const users = await this.connection.find(MongoDBAdapter.Table.User, where, { createdAt: 1 }, { skip, limit });
    return users.map((user: unknown) => new User(MongoDBAdapter.dbToSystemItem(user)));
  }

  async accessKey(accessKey: string, secretKey: string, userId: string): Promise<AccessKey> {
    const accessKeyObject = new AccessKey({ id: uuid(), accessKey, secretKey, userId });
    await this.connection.insert(MongoDBAdapter.Table.AccessKey, accessKeyObject.toJSON());
    return accessKeyObject;
  }

  async createUser(organizationId: string): Promise<User> {
    const user = new User({ id: uuid(), organizationId });
    await this.connection.insert(MongoDBAdapter.Table.User, user.toJSON());
    return user;
  }

  async updateAccessKey(accessKey: AccessKey): Promise<AccessKey> {
    await this.connection.update(MongoDBAdapter.Table.AccessKey, accessKey.id, accessKey.toJSON());
    const [result] = await this.findAccessKeys({ id: accessKey.id }, 0, 1);
    return result;
  }
}

export { MongoDBAdapter };
