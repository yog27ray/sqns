import { EventItem } from './event-manager';
import { Database } from './storage';
declare class MSQueue {
    static Database: typeof Database;
    private readonly eventManager;
    constructor({ requestTasks, database, config }?: {
        requestTasks?: Array<string>;
        database?: Database;
        config?: any;
    });
    generateRoutes(): any;
    queueComparator(queueName: string, value: (event1: EventItem, event2: EventItem) => boolean): void;
    resetAll(): any;
}
export { MSQueue };
