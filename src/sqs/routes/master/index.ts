import * as express from 'express';
import { awsAuthentication } from '../../aws/aws-authentication';
import { AwsToServerTransformer } from '../../aws/aws-to-server-transformer';
import { EventManager } from '../../event-manager';
import { EventManagerMaster } from './event-manager-master';

function getSecretKey(accessKeyId: string): Promise<{ secretAccessKey: string; accessKeyId: string; accountId: string }> {
  return Promise.resolve({ secretAccessKey: 'secretAccessKeyTest', accessKeyId, accountId: '12345' });
}

function generateRoutes(eventManager: EventManager): express.Router {
  const controller = new EventManagerMaster(eventManager);

  const router = express.Router();

  router.get('/queue/health', (request: express.Request, response: express.Response) => {
    response.send('success');
  });
  router.get('/queues/events/stats', controller.eventStats());
  router.post('/sqs/queue/:queueName/event/:eventId/success', awsAuthentication(getSecretKey),
    AwsToServerTransformer.transformRequestBody(), controller.eventSuccess());
  router.post('/sqs/queue/:queueName/event/:eventId/failure', awsAuthentication(getSecretKey),
    AwsToServerTransformer.transformRequestBody(), controller.eventFailure());
  router.post('/sqs', awsAuthentication(getSecretKey), AwsToServerTransformer.transformRequestBody(), controller.sqs());

  return router;
}

export { generateRoutes };
