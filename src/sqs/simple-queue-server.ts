import { EventItem, EventManager } from './event-manager';
import { generateRoutes as masterRoutes } from './routes/master';
import { Database } from './storage';

class SimpleQueueServer {
  static Database = Database;

  private readonly eventManager: EventManager;

  constructor({ requestTasks, database = Database.IN_MEMORY, config, cronInterval }
  : { requestTasks?: Array<string>; database?: Database; config?: any; cronInterval?: string }) {
    this.eventManager = new EventManager();
    this.eventManager.initialize(requestTasks);
    this.eventManager.setStorageEngine(database, config, cronInterval);
  }

  generateRoutes(): any {
    return masterRoutes(this.eventManager);
  }

  queueComparator(queueName: string, value: (event1: EventItem, event2: EventItem) => boolean): void {
    this.eventManager.comparatorFunction(queueName, value);
  }

  resetAll(): any {
    this.eventManager.resetAll();
  }

  cancel(): void {
    this.eventManager.cancel();
  }
}

export { SimpleQueueServer };
