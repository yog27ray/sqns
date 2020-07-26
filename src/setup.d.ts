import { Express } from 'express';
import { SimpleQueueServer } from '../index';
import { MongoDBConnection } from './sqs/storage/mongodb/mongo-d-b-connection';
declare const app: Express;
declare const queueConfig: {
    [key: string]: any;
    config: {
        uri?: string;
    };
};
declare const simpleQueueServer: SimpleQueueServer;
declare const mongoConnection: MongoDBConnection;
declare function delay(milliSeconds?: number): Promise<any>;
declare function dropDatabase(): Promise<void>;
export { app, simpleQueueServer, dropDatabase, mongoConnection, delay, queueConfig };
