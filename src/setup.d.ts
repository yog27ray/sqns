import { MSQueue } from '../index';
import { MongoDBConnection } from './storage/mongodb/mongo-d-b-connection';
declare const app: any;
declare const mSQueue: MSQueue;
declare const mongoConnection: MongoDBConnection;
export { app, mSQueue, mongoConnection };
