import * as express from 'express';
import { authentication, getSecretKey } from '../../common/auth/authentication';
import { AwsToServerTransformer } from '../../common/auth/aws-to-server-transformer';
import { transformRequest } from '../../common/auth/transform-request';
import { SQSManager } from '../manager/s-q-s-manager';
import { SQSController } from './s-q-s-controller';

function generateRoutes(sqsManager: SQSManager): express.Router {
  const controller = new SQSController(sqsManager);

  const oldRouter = express.Router();

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
  // router.use(oldRouter);
  router.get('/queue/health', (request: express.Request, response: express.Response) => {
    response.send('success');
  });
  router.get('/queues/events/stats', controller.eventStats());
  router.post('/sqs/queues',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformRequest(),
    controller.createQueueHandler());
  router.post('/sqs/queues/getUrl',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformRequest(),
    controller.getQueueUrlHandler());
  router.post('/sqs/queues/list',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformRequest(),
    controller.listQueueHandler());
  router.post('/sqs/receiveMessages',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformRequest(),
    controller.receiveMessageHandler());
  router.delete('/sqs/:region/:companyId/:queueName',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformRequest(),
    controller.deleteQueueHandler());
  router.post('/sqs/:region/:companyId/:queueName/send-message',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformRequest(),
    controller.createMessageHandler());
  router.post('/sqs/:region/:companyId/:queueName/send-message/batch',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformRequest(),
    controller.createMessageBatchHandler());
  router.post('/sqs/:region/:companyId/:queueName/id/:messageId',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformRequest(),
    controller.findMessageByIdHandler());
  router.post('/sqs/:region/:companyId/:queueName/duplication-id/:duplicationId',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformRequest(),
    controller.findMessageByDuplicationIdHandler());
  router.put('/sqs/:region/:companyId/:queueName/id/:messageId',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformRequest(),
    controller.updateMessageByIdHandler());
  router.put('/sqs/:region/:companyId/:queueName/duplication-id/:duplicationId',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformRequest(),
    controller.updateMessageByDuplicationIdHandler());
  router.put(
    '/sqs/:region/:companyId/:queueName/event/:eventId/success',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformRequest(),
    controller.eventSuccessHandler());
  router.put(
    '/sqs/:region/:companyId/:queueName/event/:eventId/failure',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformRequest(),
    controller.eventFailureHandler());
  return router;
}

export { generateRoutes };
