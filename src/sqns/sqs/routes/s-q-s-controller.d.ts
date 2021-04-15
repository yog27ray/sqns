import { ExpressMiddleware } from '../../../../typings/express';
import { SQSManager } from '../manager/s-q-s-manager';
declare class SQSController {
    private readonly _eventManager;
    constructor(eventManager: SQSManager);
    get eventManager(): SQSManager;
    eventFailure(): ExpressMiddleware;
    eventSuccess(): ExpressMiddleware;
    sqs(): ExpressMiddleware;
    eventStats(): ExpressMiddleware;
    private sendMessage;
    private sendMessageBatch;
}
export { SQSController };
