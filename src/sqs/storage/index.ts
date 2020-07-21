import { v4 as uuid } from 'uuid';
import { EventItem } from '../../../index';
import { AwsError } from '../aws/aws-error';
import { EventState } from '../event-manager/event-item';
import { Queue } from '../event-manager/queue';
import { InMemoryAdapter } from './in-memory/in-memory-adapter';
import { MongoDBAdapter } from './mongodb/mongo-d-b-adapter';
import { StorageAdapter } from './storage-adapter';

enum Database {
  IN_MEMORY = 0,
  MONGO_DB
}

class StorageEngine {
  static Database = Database;

  private _storageAdapter: StorageAdapter;

  constructor(database: Database, config: any) {
    this.setDatabaseAdapter(database, config);
  }

  async addEventItem(queueName: string, eventItem_: EventItem): Promise<EventItem> {
    const eventItem = eventItem_;
    if (!eventItem.id) {
      eventItem.id = uuid();
    }
    const queue = await this._storageAdapter.getQueue(queueName);
    const item = await this._storageAdapter.addEventItem(queue, eventItem);
    return new EventItem(item);
  }

  async getQueueNames(): Promise<Array<string>> {
    const queues = await this._storageAdapter.getQueues();
    return queues.map((queue: Queue) => queue.name);
  }

  async findEventsToProcess(queueName: string, time: Date): Promise<Array<EventItem>> {
    const queue = await this._storageAdapter.getQueue(queueName);
    const items = await this._storageAdapter.findEventsToProcess(queue, time);
    return items.map((item: any) => new EventItem(item));
  }

  async updateEventStateProcessing(queue: Queue, eventItem_: EventItem, visibilityTimeout: number, message: string): Promise<any> {
    const eventItem = eventItem_;
    eventItem.updateSentTime(new Date());
    eventItem.incrementReceiveCount();
    eventItem.eventTime = queue.calculateNewEventTime(new Date(), eventItem.receiveCount, visibilityTimeout);
    await this._storageAdapter.updateEvent(
      eventItem.id,
      {
        state: EventItem.State.PROCESSING.valueOf(),
        processingResponse: message,
        receiveCount: eventItem.receiveCount,
        firstSentTime: eventItem.firstSentTime,
        sentTime: eventItem.sentTime,
        eventTime: eventItem.eventTime,
      });
  }

  async updateEventState(queueName: string, id: string, state: EventState, message: any): Promise<any> {
    const queue = await this._storageAdapter.getQueue(queueName);
    const event = await this._storageAdapter.findById(id);
    if (!event || !queue || event.queueId !== queue.id) {
      return;
    }
    await this._storageAdapter.updateEvent(id, { ...message, state: state.valueOf() });
  }

  listQueues(queueNamePrefix: string): Promise<Array<Queue>> {
    return this._storageAdapter.getQueues(queueNamePrefix);
  }

  createQueue(queueName: string, attributes: object, tag: object): Promise<any> {
    return this._storageAdapter.createQueue(queueName, attributes, tag);
  }

  async getQueue(queueName: string): Promise<Queue> {
    const queue = await this._storageAdapter.getQueue(queueName);
    if (!queue) {
      AwsError.invalidQueueName(queueName);
    }
    return queue;
  }

  async deleteQueue(queueName: string): Promise<void> {
    const queue = await this.getQueue(queueName);
    return this._storageAdapter.deleteQueue(queue);
  }

  setDatabaseAdapter(database: Database, config: any): void {
    switch (database) {
      case StorageEngine.Database.MONGO_DB: {
        this._storageAdapter = new MongoDBAdapter(config);
        break;
      }
      case Database.IN_MEMORY:
      default: {
        this._storageAdapter = new InMemoryAdapter(config);
      }
    }
  }

  findEvent(id: string): Promise<EventItem> {
    return this._storageAdapter.findById(id);
  }
}

export { StorageEngine, Database };
