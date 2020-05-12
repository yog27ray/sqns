import * as express from 'express';
import { EventManager } from '../../event-manager';
declare function generateRoutes(eventManager: EventManager): express.Router;
export { generateRoutes };
