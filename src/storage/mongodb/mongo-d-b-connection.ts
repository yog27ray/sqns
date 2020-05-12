import fs from 'fs';
import { Db, MongoClient } from 'mongodb';

class MongoDBConnection {
  private readonly _option: any;

  private readonly _uri: string;

  private readonly _dBName: string;

  private client: MongoClient;

  constructor(uri: string, config: any) {
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
      const options: any = {
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

  async find(tableName: string, query: any = {}, sort: any = {}): Promise<Array<any>> {
    await this.connect();
    return this.getDB().collection(tableName).find(query, { sort }).toArray();
  }

  async findOne(tableName: string, query: any = {}): Promise<any> {
    await this.connect();
    return this.getDB().collection(tableName).findOne(query);
  }

  async dropDatabase(): Promise<any> {
    if (!this._dBName) {
      return Promise.resolve();
    }
    await this.connect();
    return new Promise((resolve: Function, reject: Function) => {
      this.getDB().dropDatabase((error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async getCollections(): Promise<Array<string>> {
    await this.connect();
    const collections = await this.getDB().listCollections().toArray();
    return collections.map((collection: any) => collection.name);
  }

  async insert(collectionName: string, eventItem: any): Promise<any> {
    await this.connect();
    await this.getDB().collection(collectionName).insertOne(eventItem);
  }

  async update(collectionName: string, documentId: string, document: object): Promise<void> {
    await this.connect();
    await this.getDB().collection(collectionName).updateOne({ _id: documentId }, { $set: document });
  }

  private getDB(): Db {
    return this.client.db(this._dBName);
  }

  private isFilePath(sslCA: any): boolean {
    return typeof sslCA === 'string';
  }
}

export { MongoDBConnection };
