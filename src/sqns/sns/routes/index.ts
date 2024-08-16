import * as express from 'express';
import { authenticationOld, getSecretKey } from '../../common/auth/authentication';
import { AwsToServerTransformer } from '../../common/auth/aws-to-server-transformer';
import { SNSManager } from '../manager/s-n-s-manager';
import { SNSController } from './s-n-s-controller';

function generateRouteV1(): express.Router {
  const router = express.Router();
  router.use('/sns/health', (request: express.Request, response: express.Response) => response.send('success'));

  return router;
}

function generateRoutes(relativeURL: string, snsManager: SNSManager): express.Router {
  const controller = new SNSController(relativeURL, snsManager);
  const oldRouter = express.Router();

  oldRouter.use('/sns/health', (request: express.Request, response: express.Response) => response.send('success'));

  oldRouter.get('/sns', AwsToServerTransformer.transformRequestBody(), controller.snsGet());
  oldRouter.post(
    '/sns',
    authenticationOld(getSecretKey(snsManager.getStorageEngine())),
    AwsToServerTransformer.transformRequestBody(),
    controller.sns());

  const newRouter = express.Router();
  newRouter.use(oldRouter);
  newRouter.use('/v1', generateRouteV1());
  return newRouter;
}

export { generateRoutes };
