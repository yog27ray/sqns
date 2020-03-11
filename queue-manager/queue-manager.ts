import debug from 'debug';
import { EventManager } from './event-manager';
import { router as masterRoutes } from './routes/master';
import { router as slaveRoutes } from './routes/slave';
import { container } from './inversify';
import { QueueManagerConfig } from './event-manager/queue-manager-config';

const log = debug('queue-manager:QueueManager');

class QueueManager {
  isMaster: boolean;

  constructor({ isMaster, masterURL }: { isMaster: boolean; masterURL: string; requestTasks?: Array<string> }) {
    this.isMaster = isMaster;
    const eventManager: EventManager = container.get(EventManager);
    const queueManagerConfig: QueueManagerConfig = container.get(QueueManagerConfig);
    queueManagerConfig.masterURL = masterURL;
    if (isMaster) {
      eventManager.initialize();
    }
  }

  generateRoutes(): any {
    return this.isMaster ? masterRoutes : slaveRoutes;
  }
}

export { QueueManager };
