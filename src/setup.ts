import bodyParser from 'body-parser';
import debug from 'debug';
import express from 'express';
import http from 'http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MSQueue } from '../index';
import { MongoDBConnection } from './storage/mongodb/mongo-d-b-connection';
import { Env } from './test-env';

const log = debug('ms-queue:TestServer');

const app: any = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ type: 'text/plain' }));
app.use(bodyParser.json());

let queueConfig: any;

if (process.env.TEST_DB === 'mongoDB') {
  const mongod = new MongoMemoryServer({ instance: { dbName: 'msQueue', port: 27020 } });
  mongod.getUri().catch((error: any) => log(error));
  queueConfig = { database: MSQueue.Database.MONGO_DB, config: { uri: 'mongodb://127.0.0.1:27020/msQueue' } };
} else {
  queueConfig = { config: {} };
}

const mSQueue = new MSQueue(queueConfig);
const mongoConnection = new MongoDBConnection(queueConfig.config.uri, {});

app.use('/api', mSQueue.generateRoutes());
const server = http.createServer(app);

server.listen(Env.PORT, '0.0.0.0', () => {
  log('Express server listening on %d, in test mode', Env.PORT);
});

// Expose app
export { app, mSQueue, mongoConnection };
