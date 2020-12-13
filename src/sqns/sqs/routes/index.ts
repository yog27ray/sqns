import * as express from 'express';
import { authentication, getSecretKey } from '../../common/auth/authentication';
import { AwsToServerTransformer } from '../../common/auth/aws-to-server-transformer';
import { SQSManager } from '../manager/s-q-s-manager';
import { SQSController } from './s-q-s-controller';

function generateRoutes(sqsManager: SQSManager): express.Router {
  const controller = new SQSController(sqsManager);

  const router = express.Router();

  router.get('/queue/health', (request: express.Request, response: express.Response) => {
    response.send('success');
  });
  router.get('/queues/events/stats', controller.eventStats());
  router.post(
    '/sqs/:region/:companyId/:queueName/event/:eventId/success',
    authentication(getSecretKey(sqsManager.getStorageEngine())),
    AwsToServerTransformer.transformRequestBody(),
    controller.eventSuccess());
  router.post(
    '/sqs/:region/:companyId/:queueName/event/:eventId/failure',
    authentication(getSecretKey(sqsManager.getStorageEngine())),
    AwsToServerTransformer.transformRequestBody(),
    controller.eventFailure());
  router.post(
    '/sqs',
    authentication(getSecretKey(sqsManager.getStorageEngine())),
    AwsToServerTransformer.transformRequestBody(),
    controller.sqs());

  return router;
}

export { generateRoutes };
