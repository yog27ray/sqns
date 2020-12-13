import { Express } from 'express';
// tslint:disable-next-line:ordered-imports
import { WorkerEventScheduler } from '../../index';
import { ARN } from '../../typings';
import { AdminSecretKeys, SNSConfig, SQSConfig } from '../../typings/config';
import { SQNSError } from './common/auth/s-q-n-s-error';
import { Database } from './common/database';
import { RESERVED_QUEUE_NAME, SYSTEM_QUEUE_NAME } from './common/helper/common';
import { logger } from './common/logger/logger';
import { EventItem } from './common/model/event-item';
import { Queue } from './common/model/queue';
import { generateRoutes as sqnsRoutes } from './common/routes';
import { SNSManager } from './sns/manager/s-n-s-manager';
import { generateRoutes as snsRoutes } from './sns/routes';
import { SQSManager } from './sqs/manager/s-q-s-manager';
import { generateRoutes as sqsRoutes } from './sqs/routes';

const log = logger.instance('SQNS');

class SQNS {
  private readonly region: string;

  private readonly sqsManager: SQSManager;

  private readonly snsManager: SNSManager;

  private readonly workerEventScheduler: WorkerEventScheduler;

  constructor(data: { region: string, sns?: SNSConfig, sqs?: SQSConfig, adminSecretKeys: Array<AdminSecretKeys> }) {
    log.info('Setting SQNS');
    if (!data.adminSecretKeys || !data.adminSecretKeys.length) {
      SQNSError.minAdminSecretKeys();
    }
    this.region = data.region;
    log.info('Enable SQS');
    this.sqsManager = new SQSManager(data.sqs, data.adminSecretKeys, Database.MONGO_DB);
    if (data.sns) {
      log.info('Enable SNS');
      this.snsManager = new SNSManager(data.sns, this.sqsManager, data.adminSecretKeys, Database.MONGO_DB);
      this.workerEventScheduler = new WorkerEventScheduler(
        { region: data.region, ...data.sns.clientConfig },
        [SYSTEM_QUEUE_NAME.SNS],
        undefined);
    }
  }

  queueComparator(queueARN: ARN, value: (event1: EventItem, event2: EventItem) => boolean): void {
    this.sqsManager.comparatorFunction(queueARN, value);
  }

  generateExpressRoutes(host: string, basePath: string, app: Express): void {
    app.use(basePath, sqnsRoutes());
    app.use(basePath, sqsRoutes(this.sqsManager));
    if (this.snsManager) {
      app.use(basePath, snsRoutes(`${host}${basePath}`, this.snsManager));
    }
  }

  async resetAll(): Promise<void> {
    this.sqsManager.resetAll();
    await Promise.all(RESERVED_QUEUE_NAME.map(async (queueName: string) => {
      const queue = await this.sqsManager.getQueue(Queue.arn(undefined, this.region, queueName))
        .catch(() => undefined);
      if (!queue) {
        return;
      }
      await this.sqsManager.deleteQueue(queue);
    }));
  }

  cancel(): void {
    this.workerEventScheduler?.cancel();
  }
}

export { SQNS };
