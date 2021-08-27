import { Collection, Db, MongoClient } from 'mongodb';
import { KeyValue } from '../../../../../typings/common';

class MongoDBConnection {
  private readonly _option: { [key: string]: any };

  private readonly _uri: string;

  private readonly _dBName: string;

  private client: MongoClient;

  constructor(uri: string, config: { [key: string]: unknown }) {
    this._uri = uri;
    this._option = config;
    if (this._uri) {
      this._dBName = uri.split('?')[0].split('/').pop();
    }
  }

  isConnected(): boolean {
    return !!this.client && this.client.isConnected();
  }

  async connect(): Promise<any> {
    if (this.isConnected()) {
      return;
    }
    let client: MongoClient;
    if (!this.client) {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
      client = new MongoClient(this._uri, this._option);
    } else {
      ({ client } = this);
    }
    this.client = await client.connect();
  }

  async find(
    tableName: string,
    query_: any = {},
    sort: { [key: string]: number } = {},
    { limit, skip }: { limit?: number; skip?: number } = {}): Promise<Array<any>> {
    await this.connect();
    const query = query_;
    if (query.id) {
      query._id = query.id;
      delete query.id;
    }
    return this.getDB().collection(tableName).find(query, { sort, limit, skip }).toArray();
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
    return new Promise((resolve: (item: { [key: string]: any }) => void, reject: (error: Error) => void) => {
      this.getDB().dropDatabase((error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async insert(collectionName: string, item_: KeyValue & { id?: string; _id?: string }): Promise<string> {
    await this.connect();
    const item = item_;
    if (item.id) {
      item._id = item.id;
      delete item.id;
    }
    const newDocument = await this.getDB().collection(collectionName).insertOne(item);
    return newDocument.insertedId as string;
  }

  async update(collectionName: string, documentId: string, document: { [key: string]: any }): Promise<void> {
    await this.connect();
    await this.getDB().collection(collectionName).updateOne({ _id: documentId }, { $set: { ...document, updatedAt: new Date() } });
  }

  async deleteOne(collectionName: string, filter: { [key: string]: any }): Promise<void> {
    await this.connect();
    await this.getDB().collection(collectionName).deleteOne(filter);
  }

  async count(collectionName: string, filter: { [key: string]: any }): Promise<number> {
    await this.connect();
    return this.getDB().collection(collectionName).countDocuments(filter);
  }

  async deleteMany(collectionName: string, filter: { [key: string]: any }): Promise<void> {
    await this.connect();
    await this.getDB().collection(collectionName).deleteMany(filter);
  }

  private getDB(): Db {
    return this.client.db(this._dBName);
  }
}

export { MongoDBConnection };
