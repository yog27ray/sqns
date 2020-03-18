import { EventManager } from './event-manager';
import { container } from './inversify';
import { router as masterRoutes } from './routes/master';
import { router as slaveRoutes } from './routes/slave';

class MSQueue {
  isMaster: boolean;

  constructor({ isMaster }: { isMaster: boolean; requestTasks?: Array<string> }) {
    this.isMaster = isMaster;
    const eventManager: EventManager = container.get(EventManager);
    if (isMaster) {
      eventManager.initialize();
    }
  }

  generateRoutes(): any {
    return this.isMaster ? masterRoutes : slaveRoutes;
  }
}

export { MSQueue };
