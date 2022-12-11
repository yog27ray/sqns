import bodyParser from 'body-parser';
import express, { Express } from 'express';
import http from 'http';
import { MongoMemoryServer } from 'mongodb-memory-server';
// import morgan from 'morgan';
import { SQNS, SQNSClient } from '../index';
import { DatabaseConfig, SQNSConfig } from '../typings/config';
import { Database } from './sqns/common/database';
import { MongoDBConnection } from './sqns/common/database/mongodb/mongo-d-b-connection';
import { logger } from './sqns/common/logger/logger';
import { BaseStorageEngine } from './sqns/common/model/base-storage-engine';
import { RequestClient } from './sqns/common/request-client/request-client';
import { deleteAllQueues, deleteTopics, Env } from './test-env';

const log = logger.instance('TestServer');

const app: Express = express();
// app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ type: 'text/plain' }));
app.use(bodyParser.json());

let databaseConfig: DatabaseConfig;
const setupConfig: { sqns?: SQNS; mongoConnection?: MongoDBConnection; sqnsConfig?: SQNSConfig } = {};

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
  await new Promise((resolve: (value?: unknown) => void) => {
    setupConfig.mongoConnection.collection(storageAdapter.getDBTableName('Event'))
      .createIndex(
        { MessageDeduplicationId: 1 },
        {
          unique: true,
          partialFilterExpression: { MessageDeduplicationId: { $exists: true } },
        },
        () => resolve());
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
  const mongoDB = await MongoMemoryServer.create({ instance: { dbName: 'sqns' } });
  const uri = `${mongoDB.getUri()}/sqns`;
  log.info('TestDB URI:', uri);
  databaseConfig = { database: Database.MONGO_DB, uri, config: { useUnifiedTopology: true } };
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
  server.listen(Env.PORT, '0.0.0.0', () => {
    log.info('Express server listening on %d, in test mode', Env.PORT);
  });
  await waitForServerToBoot();
});

// Expose app
export { app, setupConfig, dropDatabase, delay };
