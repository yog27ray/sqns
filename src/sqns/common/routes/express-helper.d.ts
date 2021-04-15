import { Request, Response } from 'express';
import { ExpressMiddleware } from '../../../../typings/express';
declare class ExpressHelper {
    static requestHandler(callback: (req: Request, res: Response) => Promise<any>): ExpressMiddleware;
    static errorHandler(error: Error & {
        code?: number;
    }, response: Response): void;
}
export { ExpressHelper };
