import { EventManager } from '../../event-manager';
import { ExpressMiddleware } from './express-helper';
declare class EventManagerMaster {
    private readonly _eventManager;
    constructor(eventManager: EventManager);
    get eventManager(): EventManager;
    eventFailure(): ExpressMiddleware;
    eventSuccess(): ExpressMiddleware;
    sqs(): ExpressMiddleware;
    eventStats(): ExpressMiddleware;
    private sendMessage;
    private sendMessageBatch;
}
export { EventManagerMaster };
