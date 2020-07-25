import { v4 as uuid } from 'uuid';
import { EventItem } from '../../../../index';
import { Queue } from '../../event-manager/queue';
import { StorageAdapter } from '../storage-adapter';
import { MongoDBConnection } from './mongo-d-b-connection';

class MongoDBAdapter implements StorageAdapter {
  private static readonly QUEUE_TABLE_PREFIX = '_Queue_';

  private readonly connection: MongoDBConnection;

  constructor(config: { [key: string]: any, uri?: string }) {
    const option = { ...config };
    if (!option.uri) {
      throw Error('Database URI is missing');
    }
    const { uri }: { uri?: string } = option;
    delete option.uri;
    this.connection = new MongoDBConnection(uri, option);
  }

  async addEventItem(queue: Queue, eventItem: EventItem): Promise<EventItem> {
    const currentTime = new Date();
    const mongoDocument = {
      ...eventItem,
      _id: eventItem.id,
      queueId: queue.id,
      updatedAt: currentTime,
      createdAt: currentTime,
    };
    delete mongoDocument.id;
    let insertedMongoDocument: { [key: string]: any };
    const eventTableName = this.getTableName('Event');
    try {
      await this.connection.insert(eventTableName, mongoDocument);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code !== 11000) {
        await Promise.reject(error);
      }
    }
    if (!insertedMongoDocument) {
      insertedMongoDocument = await this.connection.findOne(eventTableName, { _id: mongoDocument._id });
    }
    return new EventItem(this.dbToSystemItem(insertedMongoDocument));
  }

  async findEventsToProcess(queue: Queue, time: Date): Promise<Array<{ [key: string]: any }>> {
    const mongoDocuments = await this.connection.find(
      this.getTableName('Event'),
      {
        queueId: queue.id,
        eventTime: { $lt: time },
        state: { $in: [EventItem.State.PENDING, EventItem.State.PROCESSING, EventItem.State.FAILURE] },
        $expr: { $lt: ['$receiveCount', '$maxReceiveCount'] },
      },
      { eventTime: 1 });
    return mongoDocuments.map((mongoDocument: any) => this.dbToSystemItem(mongoDocument) as { [key: string]: any });
  }

  async getQueues(queueNamePrefix: string = ''): Promise<Array<Queue>> {
    const queues = await this.connection.find(
      this.getTableName('Queues'),
      { name: { $regex: queueNamePrefix ? `^${queueNamePrefix}` : queueNamePrefix } },
      { createdAt: 1 });
    return queues.map((queue: any) => new Queue(this.dbToSystemItem(queue)));
  }

  async updateEvent(id: string, data: { [key: string]: any }): Promise<any> {
    await this.connection.update(this.getTableName('Event'), id, { ...data, updatedAt: new Date() });
  }

  async findById(id: string): Promise<EventItem> {
    const event = await this.connection.findOne(this.getTableName('Event'), { _id: id });
    return new EventItem(this.dbToSystemItem(event));
  }

  async createQueue(queueName: string, attributes: { [key: string]: any }): Promise<Queue> {
    const queueTableName = this.getTableName('Queues');
    let queue = await this.getQueue(queueName);
    if (!queue) {
      await this.connection.insert(queueTableName, { _id: uuid(), name: queueName, attributes });
      queue = await this.getQueue(queueName);
    } else {
      await this.connection.update(queueTableName, queue.id, { attributes });
    }
    return queue;
  }

  async getQueue(name: string): Promise<Queue> {
    const queueTableName = this.getTableName('Queues');
    const dbQueue = await this.connection.findOne(queueTableName, { name });
    if (!dbQueue) {
      return undefined;
    }
    return new Queue(this.dbToSystemItem(dbQueue));
  }

  async deleteQueue(queue: Queue): Promise<void> {
    const queueTableName = this.getTableName('Queues');
    const eventTableName = this.getTableName('Event');
    await this.connection.deleteOne(queueTableName, { _id: queue.id });
    await this.connection.deleteMany(eventTableName, { queueId: queue.id });
  }

  private dbToSystemItem(row: { [key: string]: any, id?: string }): any {
    const document = { ...row };
    document.id = document._id as string;
    delete document._id;
    return document;
  }

  private getTableName(queueName: string): string {
    return `${MongoDBAdapter.QUEUE_TABLE_PREFIX}${queueName}`;
  }
}

export { MongoDBAdapter };
