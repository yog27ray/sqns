import { EventItem } from '../../../index';
import { StorageAdapter } from '../storage-adapter';
import { MongoDBConnection } from './mongo-d-b-connection';

class MongoDBAdapter implements StorageAdapter {
  private static readonly QUEUE_TABLE_PREFIX = '_Queue_';

  private readonly connection: MongoDBConnection;

  constructor(config: any) {
    const option = { ...config };
    if (!option.uri) {
      throw Error('Database URI is missing');
    }
    const { uri }: { uri: string } = option;
    delete option.uri;
    this.connection = new MongoDBConnection(uri, option);
  }

  async addEventItem(queueName: string, eventItem: any): Promise<void> {
    const mongoDocument = { ...eventItem };
    mongoDocument._id = mongoDocument.id;
    delete mongoDocument.id;
    let insertedMongoDocument;
    try {
      await this.connection.insert(this.getTableName(queueName), mongoDocument);
    } catch (error) {
      if (error.code !== 11000) {
        await Promise.reject(error);
      }
    }
    if (!insertedMongoDocument) {
      insertedMongoDocument = await this.connection.findOne(this.getTableName(queueName), { _id: mongoDocument._id });
    }
    return this.dbToSystemItem(insertedMongoDocument);
  }

  async findEventsToProcess(queueName: string, time: Date): Promise<Array<any>> {
    const mongoDocuments = await this.connection.find(
      this.getTableName(queueName),
      { eventTime: { $lt: time }, state: EventItem.State.PENDING },
      { eventTime: 1 });
    return mongoDocuments.map((mongoDocument: any) => this.dbToSystemItem(mongoDocument));
  }

  async getQueueNames(): Promise<Array<string>> {
    const allCollections = await this.connection.getCollections();
    return allCollections.filter((collectionName: string) => collectionName.startsWith(MongoDBAdapter.QUEUE_TABLE_PREFIX))
      .map((collectionName: string) => collectionName.split(MongoDBAdapter.QUEUE_TABLE_PREFIX)[1]);
  }

  async updateEvent(queueName: string, id: string, data: object): Promise<any> {
    await this.connection.update(this.getTableName(queueName), id, data);
  }

  private dbToSystemItem(document: any): any {
    const systemItem = { ...document };
    systemItem.id = systemItem._id;
    delete systemItem._id;
    return systemItem;
  }

  private getTableName(queueName: string): string {
    return `${MongoDBAdapter.QUEUE_TABLE_PREFIX}${queueName}`;
  }
}

export { MongoDBAdapter };
