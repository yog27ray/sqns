import bodyParser from 'body-parser';
import debug from 'debug';
import express from 'express';
import http from 'http';
import { MSQueue } from '../index';
import { Env } from './test-env';

const app: any = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ type: 'text/plain' }));
app.use(bodyParser.json());
const mSQueue = new MSQueue();
app.use('/api', mSQueue.generateRoutes());
const server = http.createServer(app);

const log = debug('ms-queue:App');

server.listen(Env.PORT, '0.0.0.0', () => {
  log('Express server listening on %d, in test mode', Env.PORT);
});

// Expose app
export { app, mSQueue };
