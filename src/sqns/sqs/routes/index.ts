import * as express from 'express';
import { authenticationJson, authenticationOld, getSecretKey } from '../../common/auth/authentication';
import { AwsToServerTransformer } from '../../common/auth/aws-to-server-transformer';
import { transformRequest } from '../../common/auth/transform-request';
import { SQSManager } from '../manager/s-q-s-manager';
import { SQSController } from './s-q-s-controller';

function generateRoutes(sqsManager: SQSManager): express.Router {
  const controller = new SQSController(sqsManager);

  const oldRouter = express.Router();

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
  // router.use(oldRouter);
  router.get('/queue/health', (request: express.Request, response: express.Response) => {
    response.send('success');
  });
  router.get('/queues/events/stats', controller.eventStats());
  router.post('/sqs/queues',
    authenticationJson(getSecretKey(sqsManager.getStorageEngine())),
    transformRequest(),
    controller.createQueueHandler());
  router.post('/sqs/queues/getUrl',
    authenticationJson(getSecretKey(sqsManager.getStorageEngine())),
    transformRequest(),
    controller.getQueueUrlHandler());
  router.post('/sqs/queues/list',
    authenticationJson(getSecretKey(sqsManager.getStorageEngine())),
    transformRequest(),
    controller.listQueueHandler());
  router.post('/sqs/receiveMessages',
    authenticationJson(getSecretKey(sqsManager.getStorageEngine())),
    transformRequest(),
    controller.receiveMessageHandler());
  router.delete('/sqs/:region/:companyId/:queueName',
    authenticationJson(getSecretKey(sqsManager.getStorageEngine())),
    transformRequest(),
    controller.deleteQueueHandler());
  router.post('/sqs/:region/:companyId/:queueName/send-message',
    authenticationJson(getSecretKey(sqsManager.getStorageEngine())),
    transformRequest(),
    controller.createMessageHandler());
  router.post('/sqs/:region/:companyId/:queueName/send-message/batch',
    authenticationJson(getSecretKey(sqsManager.getStorageEngine())),
    transformRequest(),
    controller.createMessageBatchHandler());
  router.post('/sqs/:region/:companyId/:queueName/id/:messageId',
    authenticationJson(getSecretKey(sqsManager.getStorageEngine())),
    transformRequest(),
    controller.findMessageByIdHandler());
  router.post('/sqs/:region/:companyId/:queueName/duplication-id/:duplicationId',
    authenticationJson(getSecretKey(sqsManager.getStorageEngine())),
    transformRequest(),
    controller.findMessageByDuplicationIdHandler());
  router.put('/sqs/:region/:companyId/:queueName/id/:messageId',
    authenticationJson(getSecretKey(sqsManager.getStorageEngine())),
    transformRequest(),
    controller.updateMessageByIdHandler());
  router.put('/sqs/:region/:companyId/:queueName/duplication-id/:duplicationId',
    authenticationJson(getSecretKey(sqsManager.getStorageEngine())),
    transformRequest(),
    controller.updateMessageByDuplicationIdHandler());
  router.put(
    '/sqs/:region/:companyId/:queueName/event/:eventId/success',
    authenticationJson(getSecretKey(sqsManager.getStorageEngine())),
    transformRequest(),
    controller.eventSuccessHandler());
  router.put(
    '/sqs/:region/:companyId/:queueName/event/:eventId/failure',
    authenticationJson(getSecretKey(sqsManager.getStorageEngine())),
    transformRequest(),
    controller.eventFailureHandler());
  return router;
}

export { generateRoutes };
