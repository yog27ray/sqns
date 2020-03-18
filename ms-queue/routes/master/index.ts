import * as express from 'express';
import { container } from '../../inversify';
import { EventManagerMaster } from './event-manager-master';

const controller = container.get(EventManagerMaster);

const router = express.Router();

router.get('/queue/health', (req: any, res: any) => res.end());
router.post('/queue/:queueName/event/bulk/new', (req: any, res: any) => controller.eventBulkNew(req, res));
router.post('/queue/:queueName/event/new', (req: any, res: any) => controller.eventNew(req, res));
router.get('/queue/:queueName/event/poll', (req: any, res: any) => controller.eventPoll(req, res));
router.post('/queue/:queueName/reset', (req: any, res: any) => controller.reset(req, res));
router.post('/queues/reset', (req: any, res: any) => controller.resetAll(req, res));
router.get('/queues/events/stats', (req: any, res: any) => controller.eventStats(req, res));

export { router };
