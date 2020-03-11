import debug from 'debug';
import { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { EventItem, EventManager } from '../../event-manager';

const log = debug('queue-manager:Route');

@injectable()
class EventManagerMaster {
  constructor(@inject(EventManager) private eventManager: EventManager) {}

  eventBulkNew(req: Request, res: Response): void {
    try {
      const { queueName } = req.params;
      let rows = req.body || [];
      if (rows.some((row: any) => !row.type)) {
        res.status(400).json({ message: 'Event type is missing for some items' });
        return;
      }
      rows = rows.map(({ type, data, id, priority }: any) => {
        const eventItem = new EventItem({ type, data, id, priority });
        this.eventManager.add(queueName, eventItem);
        return eventItem.createResponse();
      });
      res.status(201).json(rows);
    } catch (error) {
      res.status(error.code || 400).json(error.message);
    }
  }

  eventNew(req: Request, res: Response): any {
    try {
      const { body: { type, data, id, priority }, params: { queueName } }: any = req;
      if (!type) {
        res.status(400).json({ message: 'Event type is missing' });
        return;
      }
      const eventItem = new EventItem({ type, data, id, priority });
      this.eventManager.add(queueName, eventItem);
      res.status(201).json(eventItem.createResponse());
    } catch (error) {
      res.status(error.code || 400).json(error.message);
    }
  }

  eventStats(req: Request, res: Response): void {
    try {
      if (req.query.format === 'prometheus') {
        res.send(this.eventManager.prometheus);
        return;
      }
      res.json(this.eventManager.eventStats);
    } catch (error) {
      res.status(error.code || 400).json(error.message);
    }
  }

  eventPoll(req: Request, res: Response): void {
    try {
      const { queueName } = req.params;
      const eventItem = this.eventManager.poll(queueName);
      res.json(eventItem ? [eventItem] : []);
    } catch (error) {
      res.status(error.code || 400).json(error.message);
    }
  }
}

export { EventManagerMaster };
