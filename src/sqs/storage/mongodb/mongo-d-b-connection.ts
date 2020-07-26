import fs from 'fs';
import { Db, MongoClient } from 'mongodb';

class MongoDBConnection {
  private readonly _option: { [key: string]: any };

  private readonly _uri: string;

  private readonly _dBName: string;

  private client: MongoClient;

  constructor(uri: string, config: { [key: string]: any }) {
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
      const options: { [key: string]: any } = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        ...this._option,
      };

      if (this.isFilePath(options.sslCA)) {
        options.sslCA = fs.readFileSync(options.sslCA);
      }
      if (this.isFilePath(this._option.sslCert)) {
        options.sslCert = fs.readFileSync(options.sslCert);
      }
      if (this.isFilePath(this._option.sslKey)) {
        options.sslKey = fs.readFileSync(options.sslKey);
      }
      client = new MongoClient(this._uri, options);
    } else {
      ({ client } = this);
    }
    this.client = await client.connect();
  }

  async find(tableName: string, query: any = {}, sort: { [key: string]: number } = {}, limit?: number): Promise<Array<any>> {
    await this.connect();
    return this.getDB().collection(tableName).find(query, { sort, limit }).toArray();
  }

  async findOne(tableName: string, filter: any = {}): Promise<{ [key: string]: any }> {
    await this.connect();
    return this.getDB().collection(tableName).findOne(filter);
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

  async insert(collectionName: string, item: { [key: string]: any }): Promise<string> {
    await this.connect();
    const newDocument = await this.getDB().collection(collectionName).insertOne(item);
    return newDocument.insertedId as string;
  }

  async update(collectionName: string, documentId: string, document: { [key: string]: any }): Promise<void> {
    await this.connect();
    await this.getDB().collection(collectionName).updateOne({ _id: documentId }, { $set: document });
  }

  async deleteOne(collectionName: string, filter: { [key: string]: any }): Promise<void> {
    await this.connect();
    await this.getDB().collection(collectionName).deleteOne(filter);
  }

  async deleteMany(collectionName: string, filter: { [key: string]: any }): Promise<void> {
    await this.connect();
    await this.getDB().collection(collectionName).deleteMany(filter);
  }

  private getDB(): Db {
    return this.client.db(this._dBName);
  }

  private isFilePath(sslCA: any): boolean {
    return typeof sslCA === 'string';
  }
}

export { MongoDBConnection };
