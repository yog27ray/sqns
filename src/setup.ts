import bodyParser from 'body-parser';
import express, { Express } from 'express';
import http from 'http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import morgan from 'morgan';
import { logger } from './sqns/common/logger/logger';
// tslint:disable-next-line:ordered-imports
import { SQSClient } from '../index';
import { SNSConfig, SQSConfig } from '../typings/config';
import { SQNS } from './sqns';
import { Database } from './sqns/common/database';
import { MongoDBConnection } from './sqns/common/database/mongodb/mongo-d-b-connection';
import { BaseStorageEngine } from './sqns/common/model/base-storage-engine';
import { RequestClient } from './sqns/common/request-client/request-client';
import { SNSClient } from './sqns/sns/s-n-s-client';
import { deleteAllQueues, deleteTopics, Env } from './test-env';

const log = logger.instance('TestServer');

const app: Express = express();
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ type: 'text/plain' }));
app.use(bodyParser.json());

const mongoDB = new MongoMemoryServer({ instance: { dbName: 'sqns', port: 27020 } });
mongoDB.getUri().catch((error: any) => {
  log.error(error);
});
const uri = 'mongodb://127.0.0.1:27020/sqns';

const sqsConfig: SQSConfig = { config: { uri } };
const snsConfig: SNSConfig = {
  config: { uri },
  clientConfig: {
    region: Env.region,
    endpoint: `${Env.URL}/api`,
    accessKeyId: Env.accessKeyId,
    secretAccessKey: Env.secretAccessKey,
    maxRetries: 0,
  },
};
const sqns = new SQNS({
  adminSecretKeys: [{ accessKey: Env.accessKeyId, secretAccessKey: Env.secretAccessKey }],
  region: Env.region,
  sqs: sqsConfig,
  sns: snsConfig,
});
sqns.cancel();
const mongoConnection = new MongoDBConnection(uri, {});

sqns.generateExpressRoutes(`http://127.0.0.1:${Env.PORT}`, '/api', app);

const server = http.createServer(app);

if (process.env.PORT) {
  Env.PORT = Number(process.env.PORT);
  Env.URL = `http://127.0.0.1:${Env.PORT}`;
}

server.listen(Env.PORT, '0.0.0.0', () => {
  log.info('Express server listening on %d, in test mode', Env.PORT);
});

function delay(milliSeconds: number = 100): Promise<any> {
  return new Promise((resolve: (value?: unknown) => void): unknown => setTimeout(resolve, milliSeconds));
}

async function dropDatabase(): Promise<void> {
  await mongoConnection.dropDatabase();
  await sqns.resetAll();
  const storageAdapter = new BaseStorageEngine(Database.MONGO_DB, sqsConfig.config, []);
  await storageAdapter.initialize([{
    accessKey: Env.accessKeyId,
    secretAccessKey: Env.secretAccessKey,
  }]);
  const sqsClient = new SQSClient({
    region: Env.region,
    endpoint: `${Env.URL}/api`,
    accessKeyId: Env.accessKeyId,
    secretAccessKey: Env.secretAccessKey,
    maxRetries: 0,
  });
  await deleteAllQueues(sqsClient);
  const snsClient = new SNSClient({
    region: Env.region,
    endpoint: `${Env.URL}/api`,
    accessKeyId: Env.accessKeyId,
    secretAccessKey: Env.secretAccessKey,
    maxRetries: 0,
  });
  await deleteTopics(snsClient);
}

const requestClient = new RequestClient();
function waitForServerToBoot(): Promise<unknown> {
  return requestClient.get(`http://127.0.0.1:${Env.PORT}/api/sqns/health`).catch(async () => {
    await delay();
    return waitForServerToBoot();
  });
}

before(async () => waitForServerToBoot());

// Expose app
export { app, sqns, dropDatabase, mongoConnection, delay, sqsConfig };
