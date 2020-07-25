import { EventItem, EventManager } from './event-manager';
import { generateRoutes as masterRoutes } from './routes/master';
import { Database } from './storage';

class SimpleQueueServer {
  static Database = Database;

  private readonly eventManager: EventManager;

  constructor({ requestTasks, database = Database.IN_MEMORY, config }
  : { requestTasks?: Array<string>; database?: Database; config?: any }) {
    this.eventManager = new EventManager();
    this.eventManager.initialize(requestTasks);
    this.eventManager.setStorageEngine(database, config);
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
}

export { SimpleQueueServer };
