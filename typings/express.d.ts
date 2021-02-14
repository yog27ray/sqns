// <reference path="./index.d.ts" />

import { NextFunction, Request, Response } from 'express';

export type ExpressMiddleware = (req: Request, res: Response, next: NextFunction) => void;
