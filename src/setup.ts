import bodyParser from 'body-parser';
import express, { Express } from 'express';
import http from 'http';
// import morgan from 'morgan';
import { SQNS, SQNSClient } from '../index';
import { DatabaseConfig, SQNSConfig } from '../typings/config';
import { RequestClient } from './client';
import { Database } from './sqns/common/database';
import { MongoDBConnection } from './sqns/common/database/mongodb/mongo-d-b-connection';
import { logger } from './sqns/common/logger/logger';
import { BaseStorageEngine } from './sqns/common/model/base-storage-engine';
import { deleteAllQueues, deleteTopics, Env } from './test-env';

const log = logger.instance('TestServer');

const app: Express = express();
// app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ type: 'text/plain' }));
app.use(bodyParser.json());

let databaseConfig: DatabaseConfig;
const setupConfig: {
  sqns: SQNS;
  mongoConnection: MongoDBConnection;
  sqnsConfig: SQNSConfig;
} = {
  sqns: undefined as SQNS,
  mongoConnection: undefined as MongoDBConnection,
  sqnsConfig: undefined as SQNSConfig,
};

if (process.env.PORT) {
  Env.PORT = Number(process.env.PORT);
  Env.URL = `http://127.0.0.1:${Env.PORT}`;
}

function delay(milliSeconds: number = 100): Promise<any> {
  return new Promise((resolve: (value?: unknown) => void): void => {
    setTimeout(resolve, milliSeconds);
  });
}

const requestClient = new RequestClient();
function waitForServerToBoot(): Promise<unknown> {
  return requestClient.get(`http://127.0.0.1:${Env.PORT}/api/sqns/health`).catch(async () => {
    await delay();
    return waitForServerToBoot();
  });
}

async function dropDatabase(): Promise<void> {
  await setupConfig.mongoConnection.dropDatabase();
  await setupConfig.sqns.resetAll();
  const storageAdapter = new BaseStorageEngine(databaseConfig);
  await setupConfig.mongoConnection.collection(storageAdapter.getDBTableName('Event'))
    .createIndex(
      { MessageDeduplicationId: 1 },
      {
        unique: true,
        partialFilterExpression: { MessageDeduplicationId: { $exists: true } },
      });
  await storageAdapter.initialize([{
    accessKey: Env.accessKeyId,
    secretAccessKey: Env.secretAccessKey,
  }]);
  const sqnsClient = new SQNSClient({
    endpoint: `${Env.URL}/api`,
    accessKeyId: Env.accessKeyId,
    secretAccessKey: Env.secretAccessKey,
  });
  await deleteAllQueues(sqnsClient, storageAdapter, setupConfig.mongoConnection);
  await deleteTopics(sqnsClient, storageAdapter);
}

before(async () => {
  log.info('TestDB URI:', process.env.MONGODB_URI);
  databaseConfig = {
    database: Database.MONGO_DB,
    uri: process.env.MONGODB_URI,
    config: {},
  };
  // eslint-disable-next-line no-console
  console.log('>>:', databaseConfig);
  setupConfig.mongoConnection = new MongoDBConnection(databaseConfig.uri, databaseConfig.config);
  setupConfig.sqnsConfig = {
    adminSecretKeys: [{ accessKey: Env.accessKeyId, secretAccessKey: Env.secretAccessKey }],
    endpoint: `http://127.0.0.1:${Env.PORT}/api`,
    db: databaseConfig,
  };
  setupConfig.sqns = new SQNS(setupConfig.sqnsConfig);
  setupConfig.sqns.cancel();
  setupConfig.sqns.registerExpressRoutes(app);
  const server = http.createServer(app);
  // Set the timeouts in milliseconds
  server.keepAliveTimeout = 60000; // 60 seconds
  server.headersTimeout = 65000; // 65 seconds
  server.listen(Env.PORT, '0.0.0.0', () => {
    log.info('Express server listening on %d, in test mode', Env.PORT);
  });
  await waitForServerToBoot();
});

// Expose app
export { app, setupConfig, dropDatabase, delay };
