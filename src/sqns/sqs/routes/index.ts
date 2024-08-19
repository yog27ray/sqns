import * as express from 'express';
import { authentication, getSecretKey } from '../../common/auth/authentication';
import { AwsToServerTransformer } from '../../common/auth/aws-to-server-transformer';
import { transformSqsRequest } from '../../common/auth/transform-request';
import { SQSManager } from '../manager/s-q-s-manager';
import { SQSController } from './s-q-s-controller';

function generateHealthRoutes(controller: SQSController): express.Router {
  const router = express.Router();
  router.get('/queue/health', (request: express.Request, response: express.Response) => {
    response.send('success');
  });
  router.get('/queues/events/stats', controller.eventStats());
  return router;
}

function generateV1Router(controller: SQSController, sqsManager: SQSManager): express.Router {
  const router = express.Router();
  router.post('/sqs/queues',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformSqsRequest(),
    controller.createQueueHandler());
  router.post('/sqs/queues/getUrl',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformSqsRequest(),
    controller.getQueueUrlHandler());
  router.post('/sqs/queues/list',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformSqsRequest(),
    controller.listQueueHandler());
  if (!SQSManager.DISABLE_RECEIVE_MESSAGE) {
    router.post('/sqs/receiveMessages',
      authentication(getSecretKey(sqsManager.getStorageEngine()), true),
      transformSqsRequest(),
      controller.receiveMessageHandler());
  }
  router.delete('/sqs/:region/:companyId/:queueName',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformSqsRequest(),
    controller.deleteQueueHandler());
  router.post('/sqs/:region/:companyId/:queueName/send-message',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformSqsRequest(),
    controller.createMessageHandler());
  router.post('/sqs/:region/:companyId/:queueName/send-message/batch',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformSqsRequest(),
    controller.createMessageBatchHandler());
  router.post('/sqs/:region/:companyId/:queueName/id/:messageId',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformSqsRequest(),
    controller.findMessageByIdHandler());
  router.post('/sqs/:region/:companyId/:queueName/duplication-id/:duplicationId',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformSqsRequest(),
    controller.findMessageByDuplicationIdHandler());
  router.put('/sqs/:region/:companyId/:queueName/id/:messageId',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformSqsRequest(),
    controller.updateMessageByIdHandler());
  router.put('/sqs/:region/:companyId/:queueName/duplication-id/:duplicationId',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformSqsRequest(),
    controller.updateMessageByDuplicationIdHandler());
  router.put(
    '/sqs/:region/:companyId/:queueName/event/:eventId/success',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformSqsRequest(),
    controller.eventSuccessHandler());
  router.put(
    '/sqs/:region/:companyId/:queueName/event/:eventId/failure',
    authentication(getSecretKey(sqsManager.getStorageEngine()), true),
    transformSqsRequest(),
    controller.eventFailureHandler());
  return router;
}

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
  router.use(oldRouter);
  router.use(generateHealthRoutes(controller));
  router.use('/v1', generateV1Router(controller, sqsManager));
  return router;
}

export { generateRoutes };
