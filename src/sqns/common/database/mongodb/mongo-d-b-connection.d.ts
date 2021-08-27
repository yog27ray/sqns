import { Collection } from 'mongodb';
import { KeyValue } from '../../../../../typings/common';
declare class MongoDBConnection {
    private readonly _option;
    private readonly _uri;
    private readonly _dBName;
    private client;
    constructor(uri: string, config: {
        [key: string]: unknown;
    });
    isConnected(): boolean;
    connect(): Promise<any>;
    find(tableName: string, query_?: any, sort?: {
        [key: string]: number;
    }, { limit, skip }?: {
        limit?: number;
        skip?: number;
    }): Promise<Array<any>>;
    findOne(tableName: string, filter_?: KeyValue): Promise<KeyValue>;
    collection(tableName: string): Collection;
    dropDatabase(): Promise<any>;
    insert(collectionName: string, item_: KeyValue & {
        id?: string;
        _id?: string;
    }): Promise<string>;
    update(collectionName: string, documentId: string, document: {
        [key: string]: any;
    }): Promise<void>;
    deleteOne(collectionName: string, filter: {
        [key: string]: any;
    }): Promise<void>;
    count(collectionName: string, filter: {
        [key: string]: any;
    }): Promise<number>;
    deleteMany(collectionName: string, filter: {
        [key: string]: any;
    }): Promise<void>;
    private getDB;
}
export { MongoDBConnection };
