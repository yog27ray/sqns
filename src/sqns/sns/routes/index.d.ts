import * as express from 'express';
import { SNSManager } from '../manager/s-n-s-manager';
declare function generateRoutes(relativeURL: string, snsManager: SNSManager): express.Router;
export { generateRoutes };
