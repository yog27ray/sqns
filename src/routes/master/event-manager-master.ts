import { Request, Response } from 'express';
import { injectable } from 'inversify';
import { EventItem, EventManager } from '../../event-manager';
import { MSError } from '../../event-manager/m-s-error';

@injectable()
class EventManagerMaster {
  private _eventManager: EventManager;

  set eventManager(value: EventManager) {
    this._eventManager = value;
  }

  get eventManager(): EventManager {
    return this._eventManager;
  }

  requestHandler(req: Request, res: Response, callback: (req: Request, res: Response) => Promise<void>): void {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setTimeout(async () => {
      try {
        await callback(req, res);
      } catch (error) {
        res.status(error.code || 400).json(error.message);
      }
    }, 0);
  }

  eventBulkNew(req: Request, res: Response): void {
    this.requestHandler(req, res, async (): Promise<any> => {
      const { queueName } = req.params;
      let rows = req.body || [];
      if (rows.some((row: any) => !row.type)) {
        throw new MSError({ code: 400, message: 'Event type is missing for some items' });
      }
      rows = await Promise.all(rows.map(async ({ type, data, id, priority, eventTime }: any) => {
        const eventItem = new EventItem({ type, data, id, priority, eventTime: eventTime ? new Date(eventTime) : eventTime });
        await this.eventManager.add(queueName, eventItem);
        return eventItem.createResponse();
      }));
      res.status(201).json(rows);
      return Promise.resolve();
    });
  }

  eventNew(req: Request, res: Response): any {
    this.requestHandler(req, res, async (): Promise<any> => {
      const { body: { type, data, id, priority, eventTime }, params: { queueName } }: any = req;
      if (!type) {
        throw new MSError({ code: 400, message: 'Event type is missing' });
      }
      const eventItem = new EventItem({ type, data, id, priority, eventTime: eventTime ? new Date(eventTime) : eventTime });
      await this.eventManager.add(queueName, eventItem);
      res.status(201).json(eventItem.createResponse());
      return Promise.resolve();
    });
  }

  eventSuccess(req: Request, res: Response): any {
    this.requestHandler(req, res, async (): Promise<any> => {
      const { queueName, id } = req.params;
      req.body.message = req.body.message || 'Event marked success without response.';
      await this.eventManager.updateEventStateSuccess(queueName, id, req.body);
      res.status(200).json({ message: 'updated' });
    });
  }

  eventFailure(req: Request, res: Response): any {
    this.requestHandler(req, res, async (): Promise<any> => {
      const { queueName, id } = req.params;
      req.body.message = req.body.message || 'Event marked failed without response.';
      await this.eventManager.updateEventStateFailure(queueName, id, req.body);
      res.status(200).json({ message: 'updated' });
    });
  }

  eventStats(req: Request, res: Response): void {
    this.requestHandler(req, res, (): Promise<any> => {
      if (req.query.format === 'prometheus') {
        res.send(this.eventManager.prometheus);
        return;
      }
      res.json(this.eventManager.eventStats);
    });
  }

  eventPoll(req: Request, res: Response): void {
    this.requestHandler(req, res, async (): Promise<any> => {
      const { queueName } = req.params;
      const eventItem = await this.eventManager.poll(queueName);
      res.json(eventItem ? [eventItem] : []);
      return Promise.resolve();
    });
  }

  reset(req: Request, res: Response): void {
    this.requestHandler(req, res, (): Promise<any> => {
      const { queueName } = req.params;
      this.eventManager.reset(queueName);
      res.end();
      return Promise.resolve();
    });
  }

  resetAll(req: Request, res: Response): void {
    this.requestHandler(req, res, (): Promise<any> => {
      this.eventManager.resetAll(false);
      res.end();
      return Promise.resolve();
    });
  }
}

export { EventManagerMaster };
