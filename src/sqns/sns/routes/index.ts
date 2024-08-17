import * as express from 'express';
import { authentication, getSecretKey } from '../../common/auth/authentication';
import { AwsToServerTransformer } from '../../common/auth/aws-to-server-transformer';
import { SNSManager } from '../manager/s-n-s-manager';
import { SNSController } from './s-n-s-controller';

function generateHealth(): express.Router {
  const router = express.Router();
  router.use('/sns/health', (request: express.Request, response: express.Response) => response.send('success'));
  return router;
}

function generateRouteV1(controller: SNSController, snsManager: SNSManager): express.Router {
  const router = express.Router();
  return router;
}

function generateRoutes(relativeURL: string, snsManager: SNSManager): express.Router {
  const controller = new SNSController(relativeURL, snsManager);
  const oldRouter = express.Router();

  oldRouter.post(
    '/sns',
    authentication(getSecretKey(snsManager.getStorageEngine())),
    AwsToServerTransformer.transformRequestBody(),
    controller.sns());

  const router = express.Router();
  router.use(oldRouter);
  router.use(generateHealth());
  router.use('/v1', generateRouteV1(controller, snsManager));
  return router;
}

export { generateRoutes };
