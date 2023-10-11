import { Collection } from 'mongodb';
import { KeyValue } from '../../../../../typings/common';
declare class MongoDBConnection {
    private readonly _option;
    private readonly _uri;
    private readonly _dBName;
    private client;
    constructor(uri: string, config: Record<string, unknown>);
    isConnected(): boolean;
    connect(): Promise<any>;
    find(tableName: string, query_?: Record<string, unknown>, sort?: {
        [key: string]: 1 | -1;
    }, { limit, skip }?: {
        limit?: number;
        skip?: number;
    }): Promise<Array<Record<string, unknown>>>;
    findOne(tableName: string, filter_?: KeyValue): Promise<KeyValue>;
    collection(tableName: string): Collection;
    dropDatabase(): Promise<any>;
    insert(collectionName: string, item_: KeyValue & {
        id?: string;
        _id?: string;
    }): Promise<string>;
    update(collectionName: string, documentId: string, document: Record<string, unknown>): Promise<void>;
    deleteOne(collectionName: string, filter: Record<string, unknown>): Promise<void>;
    count(collectionName: string, filter: Record<string, unknown>): Promise<number>;
    deleteMany(collectionName: string, filter: Record<string, unknown>): Promise<void>;
    private getDB;
}
export { MongoDBConnection };
