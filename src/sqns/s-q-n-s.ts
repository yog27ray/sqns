import { Express } from 'express';
import { ARN } from '../../typings/typings';
import { SQNSConfig } from '../../typings/config';
import { SQNSError } from './common/auth/s-q-n-s-error';
import { BaseClient } from './common/client/base-client';
import { RESERVED_QUEUE_NAME } from './common/helper/common';
import { logger } from './common/logger/logger';
import { EventItem } from './common/model/event-item';
import { Queue } from './common/model/queue';
import { generateRoutes as sqnsRoutes } from './common/routes';
import { SNSManager } from './sns/manager/s-n-s-manager';
import { generateRoutes as snsRoutes } from './sns/routes';
import { SQSManager } from './sqs/manager/s-q-s-manager';
import { generateRoutes as sqsRoutes } from './sqs/routes';

const log = logger.instance('SQNS');

export class SQNS {
  private readonly _url: { host: string; basePath: string; endpoint: string };

  private readonly region: string;

  private readonly sqsManager: SQSManager;

  private readonly snsManager: SNSManager;

  constructor(config: SQNSConfig) {
    log.info('Setting SQNS');
    if (!config.adminSecretKeys || !config.adminSecretKeys.length) {
      SQNSError.minAdminSecretKeys();
    }
    this._url = {
      host: config.endpoint.split('/').splice(0, 3).join('/'),
      basePath: `/${config.endpoint.split('/').splice(3, 100).join('/')}`,
      endpoint: config.endpoint,
    };
    this.region = BaseClient.REGION;
    if (!config.sqs?.disable) {
      log.info('Enable SQS');
      this.sqsManager = new SQSManager({ endpoint: config.endpoint, db: config.db, ...(config.sqs || {}) }, config.adminSecretKeys);
    }
    if (!config.sns?.disable) {
      log.info('Enable SNS');
      this.snsManager = new SNSManager({ endpoint: config.endpoint, db: config.db, ...(config.sns || {}) }, config.adminSecretKeys);
    }
  }

  queueComparator(queueARN: ARN, value: (event1: EventItem, event2: EventItem) => boolean): void {
    this.sqsManager.comparatorFunction(queueARN, value);
  }

  registerExpressRoutes(app: Express): void {
    app.use(this._url.basePath, sqnsRoutes());
    if (this.sqsManager) {
      app.use(this._url.basePath, sqsRoutes(this.sqsManager));
    }
    if (this.snsManager) {
      app.use(this._url.basePath, snsRoutes(`${this._url.host}${this._url.basePath}`, this.snsManager));
    }
  }

  async resetAll(): Promise<void> {
    this.sqsManager.resetAll();
    await Promise.all(RESERVED_QUEUE_NAME.map(async (queueName: string) => {
      const queue = await this.sqsManager.getQueue(Queue.arn(undefined, this.region, queueName)).catch(() => undefined);
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
