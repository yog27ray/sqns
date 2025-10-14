import { trace } from '@opentelemetry/api';
import { Express, Request } from 'express';
import { Logger4Node } from 'logger4node';
import { randomBytes } from 'node:crypto';
import { AdminSecretKeys, SQNSConfig } from '../../typings/config';
import { ARN, BaseClient, EventItem } from '../client';
import { SQNSErrorCreator } from './common/auth/s-q-n-s-error-creator';
import { RESERVED_QUEUE_NAME } from './common/helper/common';
import { logger, updateLogging } from './common/logger/logger';
import { BaseStorageEngine } from './common/model/base-storage-engine';
import { Queue } from './common/model/queue';
import { generateRoutes as sqnsRoutes } from './common/routes';
import { SNSManager } from './sns/manager/s-n-s-manager';
import { generateRoutes as snsRoutes } from './sns/routes';
import { SQSManager } from './sqs/manager/s-q-s-manager';
import { generateRoutes as sqsRoutes } from './sqs/routes';

const log = logger.instance('SQNS');

export function getTraceId(): string {
  const activeSpan = trace.getActiveSpan();
  if (!activeSpan) {
    return `cs${randomBytes(16).toString('hex')}`;
  }
  return activeSpan.spanContext().traceId;
}

export class SQNS {
  private readonly _url: { host: string; basePath: string; endpoint: string };

  private readonly region: string;

  private readonly sqsManager: SQSManager;

  private readonly snsManager: SNSManager;

  constructor(config: SQNSConfig) {
    log.info('Setting SQNS');
    if (!config.adminSecretKeys || !config.adminSecretKeys.length) {
      SQNSErrorCreator.minAdminSecretKeys();
    }
    this._url = {
      host: config.endpoint.split('/').splice(0, 3).join('/'),
      basePath: `/${config.endpoint.split('/').splice(3, 100).join('/')}`,
      endpoint: config.endpoint,
    };
    this.region = BaseClient.REGION;
    if (!config.sqs?.disable) {
      log.info('Enable SQS');
      this.sqsManager = new SQSManager({ endpoint: config.endpoint, db: config.db, ...(config.sqs || {}) });
    }
    if (!config.sns?.disable) {
      log.info('Enable SNS');
      this.snsManager = new SNSManager({
        endpoint: config.endpoint,
        db: config.db,
        queueAccessKey: config.adminSecretKeys[0].accessKey,
        queueSecretAccessKey: config.adminSecretKeys[0].secretAccessKey,
        ...(config.sns || {}),
        logging: config.logging,
      });
    }
    new BaseStorageEngine(config.db)
      .initialize(config.adminSecretKeys.map((each: AdminSecretKeys) => each))
      .catch((error: Error) => {
        log.error(error);
        process.exit(1);
      });
    updateLogging(config.logging);
  }

  queueComparator(queueARN: ARN, value: (event1: EventItem, event2: EventItem) => boolean): void {
    this.sqsManager.comparatorFunction(queueARN, value);
  }

  registerExpressRoutes(app: Express): void {
    app.use(Logger4Node.Trace.requestHandler((req: Request) => {
      req.headers['request-id'] = req.headers['request-id'] || randomBytes(8).toString('hex');
      return { path: req.path, traceId: getTraceId(), id: req.headers['request-id'] as string };
    }));
    app.use(this._url.basePath, sqnsRoutes());
    if (this.sqsManager) {
      log.info('SQS path added.');
      app.use(this._url.basePath, sqsRoutes(this.sqsManager));
    }
    if (this.snsManager) {
      log.info('SNS path added.');
      app.use(this._url.basePath, snsRoutes(`${this._url.host}${this._url.basePath}`, this.snsManager));
    }
  }

  async resetAll(): Promise<void> {
    this.sqsManager.resetAll();
    await Promise.all(RESERVED_QUEUE_NAME.map(async (queueName: string) => {
      const queue = await this.sqsManager.getQueue(Queue.arn(undefined, this.region, queueName)).catch((): Queue => undefined);
      if (!queue) {
        return;
      }
      await this.sqsManager.deleteQueue(queue);
    }));
  }

  cancel(): void {
    this.snsManager?.cancel();
  }
}
