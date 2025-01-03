import * as express from 'express';
import { authentication, getSecretKey } from '../../common/auth/authentication';
import { AwsToServerTransformer } from '../../common/auth/aws-to-server-transformer';
import { transformSnsRequest } from '../../common/auth/transform-request';
import { SNSManager } from '../manager/s-n-s-manager';
import { SNSController } from './s-n-s-controller';

function generateHealth(): express.Router {
  const router = express.Router();
  router.get('/sns/health', (_request: express.Request, response: express.Response) => {
    response.send('success');
  });
  return router;
}

function generateRouteV1(controller: SNSController, snsManager: SNSManager): express.Router {
  const router = express.Router();
  router.post(
    '/sns/topics',
    authentication(getSecretKey(snsManager.getStorageEngine()), true),
    transformSnsRequest(),
    controller.createTopicHandler());
  router.post(
    '/sns/topics/list',
    authentication(getSecretKey(snsManager.getStorageEngine()), true),
    transformSnsRequest(),
    controller.listTopicHandler());
  router.delete(
    '/sns/topic',
    authentication(getSecretKey(snsManager.getStorageEngine()), true),
    transformSnsRequest(),
    controller.deleteTopicHandler());
  router.post(
    '/sns/topic/attributes',
    authentication(getSecretKey(snsManager.getStorageEngine()), true),
    transformSnsRequest(),
    controller.getTopicAttributesHandler());
  router.put(
    '/sns/topic/attributes',
    authentication(getSecretKey(snsManager.getStorageEngine()), true),
    transformSnsRequest(),
    controller.setTopicAttributesHandler());
  router.post(
    '/sns/publish',
    authentication(getSecretKey(snsManager.getStorageEngine()), true),
    transformSnsRequest(),
    controller.publishHandler());
  router.post(
    '/sns/publish/find',
    authentication(getSecretKey(snsManager.getStorageEngine()), true),
    transformSnsRequest(),
    controller.getPublishHandler());
  router.post(
    '/sns/subscribe',
    authentication(getSecretKey(snsManager.getStorageEngine()), true),
    transformSnsRequest(),
    controller.subscribeHandler());
  router.post(
    '/sns/subscriptions/list',
    authentication(getSecretKey(snsManager.getStorageEngine()), true),
    transformSnsRequest(),
    controller.listSubscriptionHandler());
  router.get(
    '/sns/subscriptions/confirm',
    controller.confirmSubscriptionHandler());
  router.post(
    '/sns/subscriptions/list/by-topic',
    authentication(getSecretKey(snsManager.getStorageEngine()), true),
    transformSnsRequest(),
    controller.listSubscriptionByTopicHandler());
  router.post(
    '/sns/subscription',
    authentication(getSecretKey(snsManager.getStorageEngine()), true),
    transformSnsRequest(),
    controller.getSubscriptionHandler());
  router.delete(
    '/sns/subscription',
    authentication(getSecretKey(snsManager.getStorageEngine()), true),
    transformSnsRequest(),
    controller.unsubscribeHandler());
  router.post(
    '/sns/published',
    authentication(getSecretKey(snsManager.getStorageEngine()), true),
    transformSnsRequest(),
    controller.publishedTopicHandler());
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
