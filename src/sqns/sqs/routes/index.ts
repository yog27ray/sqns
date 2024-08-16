import * as express from 'express';
import { authentication, getSecretKey } from '../../common/auth/authentication';
import { AwsToServerTransformer } from '../../common/auth/aws-to-server-transformer';
import { SQSManager } from '../manager/s-q-s-manager';
import { SQSController } from './s-q-s-controller';
import { transformRequest } from '../../common/auth/transform-request';

function generateRoutes(sqsManager: SQSManager): express.Router {
  const controller = new SQSController(sqsManager);

  const oldRouter = express.Router();

  oldRouter.get('/queue/health', (request: express.Request, response: express.Response) => {
    response.send('success');
  });
  oldRouter.get('/queues/events/stats', controller.eventStats());
  oldRouter.post(
    '/sqs/:region/:companyId/:queueName/event/:eventId/success',
    authentication(getSecretKey(sqsManager.getStorageEngine())),
    AwsToServerTransformer.transformRequestBody(),
    controller.eventSuccess());
  oldRouter.post(
    '/sqs/:region/:companyId/:queueName/event/:eventId/failure',
    authentication(getSecretKey(sqsManager.getStorageEngine())),
    AwsToServerTransformer.transformRequestBody(),
    controller.eventFailure());
  oldRouter.post(
    '/sqs',
    authentication(getSecretKey(sqsManager.getStorageEngine())),
    AwsToServerTransformer.transformRequestBody(),
    controller.sqs());

  const router = express.Router();
  router.use(oldRouter);
  router.post('/sqs/queue',
    authentication(getSecretKey(sqsManager.getStorageEngine())),
    transformRequest(),
    controller.createQueueHandler());
  router.post('/sqs/message',
    authentication(getSecretKey(sqsManager.getStorageEngine())),
    transformRequest(),
    controller.createMessageHandler());
  router.post('/sqs/receiveMessage',
    authentication(getSecretKey(sqsManager.getStorageEngine())),
    transformRequest(),
    controller.receiveMessageHandler());
  return router;
}

export { generateRoutes };
