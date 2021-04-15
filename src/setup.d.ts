import { Express } from 'express';
import { SQNS } from '../index';
import { SQNSConfig } from '../typings/config';
import { MongoDBConnection } from './sqns/common/database/mongodb/mongo-d-b-connection';
declare const app: Express;
declare const setupConfig: {
    sqns?: SQNS;
    mongoConnection?: MongoDBConnection;
    sqnsConfig?: SQNSConfig;
};
declare function delay(milliSeconds?: number): Promise<any>;
declare function dropDatabase(): Promise<void>;
export { app, setupConfig, dropDatabase, delay };
