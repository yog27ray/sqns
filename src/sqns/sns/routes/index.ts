import * as express from 'express';
import { authentication, getSecretKey } from '../../common/auth/authentication';
import { AwsToServerTransformer } from '../../common/auth/aws-to-server-transformer';
import { SNSManager } from '../manager/s-n-s-manager';
import { SNSController } from './s-n-s-controller';

function generateRoutes(relativeURL: string, snsManager: SNSManager): express.Router {
  const controller = new SNSController(relativeURL, snsManager);
  const router = express.Router();

  router.use('/sns/health', (request: express.Request, response: express.Response) => response.send('success'));

  router.get('/sns', AwsToServerTransformer.transformRequestBody(), controller.snsGet());
  router.post(
    '/sns',
    authentication(getSecretKey(snsManager.getStorageEngine())),
    AwsToServerTransformer.transformRequestBody(),
    controller.sns());

  return router;
}

export { generateRoutes };
