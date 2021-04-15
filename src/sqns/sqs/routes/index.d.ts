import * as express from 'express';
import { SQSManager } from '../manager/s-q-s-manager';
declare function generateRoutes(sqsManager: SQSManager): express.Router;
export { generateRoutes };
