import * as express from 'express';
import { EventManagerMaster } from './event-manager-master';
import { container } from '../../inversify';

const controller = container.get(EventManagerMaster);

const router = express.Router();

router.post('/queue/:queueName/event/bulk/new', (req: any, res: any) => controller.eventBulkNew(req, res));
router.post('/queue/:queueName/event/new', (req: any, res: any) => controller.eventNew(req, res));
router.post('/queue/:queueName/event/poll', (req: any, res: any) => controller.eventPoll(req, res));
router.get('/events/stats', (req: any, res: any) => controller.eventStats(req, res));

export { router };
