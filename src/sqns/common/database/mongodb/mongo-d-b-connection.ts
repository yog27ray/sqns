import { Collection, Condition, Db, MongoClient, ObjectId } from 'mongodb';
import { KeyValue } from '../../../../client';

class MongoDBConnection {
  private readonly _option: Record<string, unknown>;

  private readonly _uri: string;

  private readonly _dBName: string;

  private client: MongoClient;

  constructor(uri: string, config: Record<string, unknown>) {
    this._uri = uri;
    this._option = config;
    if (this._uri) {
      this._dBName = uri.split('?')[0].split('/').pop();
    }
  }

  isConnected(): boolean {
    return !!this.client;
  }

  async connect(): Promise<any> {
    if (this.isConnected()) {
      return;
    }
    let client: MongoClient;
    if (!this.client) {
      client = new MongoClient(this._uri, this._option);
    } else {
      ({ client } = this);
    }
    this.client = await client.connect();
  }

  async find(
    tableName: string,
    query_: Record<string, unknown> = {},
    sort: { [key: string]: 1 | -1 } = {},
    { limit, skip }: { limit?: number; skip?: number } = {}): Promise<Array<Record<string, unknown>>> {
    await this.connect();
    const query = query_;
    if (query.id) {
      query._id = query.id;
      delete query.id;
    }
    const dbQuery = this.getDB().collection(tableName).find(query)
      .skip(skip || 0)
      .limit(limit || 100);
    Object.keys(sort).forEach((key: string) => dbQuery.sort(key, sort[key]));
    return dbQuery.toArray();
  }

  async findOne(tableName: string, filter_: KeyValue = {}): Promise<KeyValue> {
    const filter = filter_;
    await this.connect();
    if (filter.id) {
      filter._id = filter.id;
      delete filter.id;
    }
    return await this.collection(tableName).findOne(filter) as KeyValue;
  }

  collection(tableName: string): Collection {
    return this.getDB().collection(tableName);
  }

  async dropDatabase(): Promise<any> {
    if (!this._dBName) {
      return Promise.resolve();
    }
    await this.connect();
    return this.getDB().dropDatabase();
  }

  async insert(collectionName: string, item_: KeyValue & { id?: string; _id?: string }): Promise<string> {
    await this.connect();
    const item = item_;
    if (item.id) {
      item._id = item.id;
      delete item.id;
    }
    const dbCollection = this.getDB().collection(collectionName);
    const newDocument = await dbCollection.insertOne(item as unknown);
    return newDocument.insertedId as unknown as string;
  }

  async update(
    collectionName: string,
    documentId: string,
    document: Record<string, unknown>,
    dbOperations: { increment?: Record<string, number>; } = {}): Promise<void> {
    await this.connect();
    const update: {
      $set: Record<string, unknown>;
      $inc?: Record<string, number>;
    } = { $set: { ...document, updatedAt: new Date() } };
    if (dbOperations?.increment) {
      update.$inc = dbOperations.increment;
    }
    await this.getDB().collection(collectionName)
      .updateOne(
        { _id: documentId as unknown as Condition<ObjectId> },
        update as unknown);
  }

  async deleteOne(collectionName: string, filter: Record<string, unknown>): Promise<void> {
    await this.connect();
    await this.getDB().collection(collectionName).deleteOne(filter);
  }

  async count(collectionName: string, filter: Record<string, unknown>): Promise<number> {
    await this.connect();
    return this.getDB().collection(collectionName).countDocuments(filter);
  }

  async deleteMany(collectionName: string, filter: Record<string, unknown>): Promise<void> {
    await this.connect();
    await this.getDB().collection(collectionName).deleteMany(filter);
  }

  private getDB(): Db {
    return this.client.db(this._dBName);
  }
}

export { MongoDBConnection };
