import { NextFunction, Request, Response } from 'express';
export declare type ExpressMiddleware = (req: Request, res: Response, next: NextFunction) => void;
