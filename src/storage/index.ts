import { EventItem } from '../../index';
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

  async addEventItem(queueName: string, eventItem: EventItem): Promise<EventItem> {
    const item = await this._storageAdapter.addEventItem(queueName, eventItem.toJSON());
    return new EventItem(item);
  }

  async getQueueNames(): Promise<Array<string>> {
    return this._storageAdapter.getQueueNames();
  }

  async findEventsToProcess(queueName: string, time: Date): Promise<Array<EventItem>> {
    const items = await this._storageAdapter.findEventsToProcess(queueName, time);
    return items.map((item: any) => new EventItem(item));
  }

  async updateEventStateProcessing(queueName: string, id: string, message: string): Promise<any> {
    await this._storageAdapter.updateEvent(
      queueName,
      id,
      { state: EventItem.State.PROCESSING.valueOf(), processingResponse: { message } });
  }

  async updateEventStateSuccess(queueName: string, id: string, successResponse: any): Promise<any> {
    await this._storageAdapter.updateEvent(
      queueName,
      id,
      { state: EventItem.State.SUCCESS.valueOf(), successResponse });
  }

  async updateEventStateFailure(queueName: string, id: string, failureResponse: any): Promise<any> {
    await this._storageAdapter.updateEvent(
      queueName,
      id,
      { state: EventItem.State.FAILURE.valueOf(), failureResponse });
  }

  private setDatabaseAdapter(database: Database, config: any): void {
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
}

export { StorageEngine, Database };
