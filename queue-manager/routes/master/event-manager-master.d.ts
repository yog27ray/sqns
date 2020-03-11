import { Request, Response } from 'express';
import { EventManager } from '../../event-manager';
declare class EventManagerMaster {
    private eventManager;
    constructor(eventManager: EventManager);
    eventBulkNew(req: Request, res: Response): void;
    eventNew(req: Request, res: Response): any;
    eventStats(req: Request, res: Response): void;
    eventPoll(req: Request, res: Response): void;
}
export { EventManagerMaster };
