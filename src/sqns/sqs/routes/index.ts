import * as express from 'express';
import { authenticationJson, authenticationOld, getSecretKey } from '../../common/auth/authentication';
import { AwsToServerTransformer } from '../../common/auth/aws-to-server-transformer';
import { transformRequest } from '../../common/auth/transform-request';
import { SQSManager } from '../manager/s-q-s-manager';
import { SQSController } from './s-q-s-controller';

function generateRoutes(sqsManager: SQSManager): express.Router {
  const controller = new SQSController(sqsManager);

  const oldRouter = express.Router();

  oldRouter.get('/queue/health', (request: express.Request, response: express.Response) => {
    response.send('success');
  });
  oldRouter.get('/queues/events/stats', controller.eventStats());
  oldRouter.post(
    '/sqs/:region/:companyId/:queueName/event/:eventId/success',
    authenticationOld(getSecretKey(sqsManager.getStorageEngine())),
    AwsToServerTransformer.transformRequestBody(),
    controller.eventSuccess());
  oldRouter.post(
    '/sqs/:region/:companyId/:queueName/event/:eventId/failure',
    authenticationOld(getSecretKey(sqsManager.getStorageEngine())),
    AwsToServerTransformer.transformRequestBody(),
    controller.eventFailure());
  oldRouter.post(
    '/sqs',
    authenticationOld(getSecretKey(sqsManager.getStorageEngine())),
    AwsToServerTransformer.transformRequestBody(),
    controller.sqs());

  const router = express.Router();
  router.use(oldRouter);
  router.post('/sqs/queue',
    authenticationJson(getSecretKey(sqsManager.getStorageEngine())),
    transformRequest(),
    controller.createQueueHandler());
  router.post('/sqs/message',
    authenticationJson(getSecretKey(sqsManager.getStorageEngine())),
    transformRequest(),
    controller.createMessageHandler());
  router.post('/sqs/receiveMessage',
    authenticationJson(getSecretKey(sqsManager.getStorageEngine())),
    transformRequest(),
    controller.receiveMessageHandler());
  return router;
}

export { generateRoutes };
