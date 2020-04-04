import { EventItem, EventManager } from './event-manager';
import { container } from './inversify';
import { router as masterRoutes } from './routes/master';

class MSQueue {
  private eventManager: EventManager;

  constructor({ requestTasks }: { requestTasks?: Array<string> } = {}) {
    this.eventManager = container.get(EventManager);
    this.eventManager.initialize(requestTasks);
  }

  generateRoutes(): any {
    return masterRoutes;
  }

  queueComparator(queueName: string, value: (event1: EventItem, event2: EventItem) => boolean): void {
    this.eventManager.comparatorFunction(queueName, value);
  }
}

export { MSQueue };
