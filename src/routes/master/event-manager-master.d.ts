import { Request, Response } from 'express';
import { EventManager } from '../../event-manager';
declare class EventManagerMaster {
    private _eventManager;
    set eventManager(value: EventManager);
    get eventManager(): EventManager;
    requestHandler(req: Request, res: Response, callback: (req: Request, res: Response) => Promise<void>): void;
    eventBulkNew(req: Request, res: Response): void;
    eventNew(req: Request, res: Response): any;
    eventSuccess(req: Request, res: Response): any;
    eventFailure(req: Request, res: Response): any;
    eventStats(req: Request, res: Response): void;
    eventPoll(req: Request, res: Response): void;
    reset(req: Request, res: Response): void;
    resetAll(req: Request, res: Response): void;
}
export { EventManagerMaster };
