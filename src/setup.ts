import bodyParser from 'body-parser';
import debug from 'debug';
import express from 'express';
import http from 'http';
import { MongoMemoryServer } from 'mongodb-memory-server';
// import morgan from 'morgan';
import rp from 'request-promise';
import { SimpleQueueServer } from '../index';
import { MongoDBConnection } from './sqs/storage/mongodb/mongo-d-b-connection';
import { Env } from './test-env';

const log = debug('ms-queue:TestServer');

const app: any = express();
// app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ type: 'text/plain' }));
app.use(bodyParser.json());

let queueConfig: any;

if (process.env.TEST_DB === 'mongoDB') {
  const mongoDB = new MongoMemoryServer({ instance: { dbName: 'msQueue', port: 27020 } });
  mongoDB.getUri().catch((error: any) => log(error));
  queueConfig = { database: SimpleQueueServer.Database.MONGO_DB, config: { uri: 'mongodb://127.0.0.1:27020/msQueue' } };
} else {
  queueConfig = { config: {} };
}
const simpleQueueServer = new SimpleQueueServer(queueConfig);

const mongoConnection = new MongoDBConnection(queueConfig.config.uri, {});

app.use('/api', simpleQueueServer.generateRoutes());

const server = http.createServer(app);

if (process.env.PORT) {
  Env.PORT = Number(process.env.PORT);
  Env.URL = `http://localhost:${Env.PORT}`;
}

server.listen(Env.PORT, '0.0.0.0', () => {
  log('Express server listening on %d, in test mode', Env.PORT);
});

function delay(): Promise<any> {
  return new Promise((resolve: Function) => setTimeout(resolve, 100));
}

async function dropDatabase(): Promise<void> {
  await mongoConnection.dropDatabase();
  await simpleQueueServer.resetAll();
}

function waitForServerToBoot(): Promise<any> {
  return rp(`http://localhost:${Env.PORT}/api/queue/health`)
    // eslint-disable-next-line promise/no-nesting
    .catch(() => new Promise((resolve: Function, reject: Function) => {
      waitForServerToBoot().then(() => resolve()).catch(() => reject());
    }));
}

before(async () => {
  await waitForServerToBoot();
});

// Expose app
export { app, simpleQueueServer, dropDatabase, mongoConnection, delay };
