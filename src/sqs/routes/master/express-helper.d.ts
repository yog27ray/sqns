import { NextFunction, Request, Response } from 'express';
declare type ExpressMiddleware = (req: Request, res: Response, next: NextFunction) => void;
declare class ExpressHelper {
    static requestHandler(callback: (req: Request, res: Response) => Promise<any>): ExpressMiddleware;
    static errorHandler(error: Error & {
        code?: number;
    }, response: Response): void;
}
export { ExpressMiddleware, ExpressHelper };
