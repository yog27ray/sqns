import * as express from 'express';
import { EventManager } from '../../event-manager';
import { container } from '../../inversify';
import { EventManagerMaster } from './event-manager-master';

function generateRoutes(eventManager: EventManager): express.Router {
  const controller = container.get(EventManagerMaster);
  controller.eventManager = eventManager;

  const router = express.Router();

  router.get('/queue/health', (req: any, res: any) => res.end());
  router.post('/queue/:queueName/event/bulk/new', (req: any, res: any) => controller.eventBulkNew(req, res));
  router.post('/queue/:queueName/event/new', (req: any, res: any) => controller.eventNew(req, res));
  router.post('/queue/:queueName/event/:id/success', (req: any, res: any) => controller.eventSuccess(req, res));
  router.post('/queue/:queueName/event/:id/failure', (req: any, res: any) => controller.eventFailure(req, res));
  router.get('/queue/:queueName/event/poll', (req: any, res: any) => controller.eventPoll(req, res));
  router.post('/queue/:queueName/reset', (req: any, res: any) => controller.reset(req, res));
  router.post('/queues/reset', (req: any, res: any) => controller.resetAll(req, res));
  router.get('/queues/events/stats', (req: any, res: any) => controller.eventStats(req, res));

  return router;
}

export { generateRoutes };
