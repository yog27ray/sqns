import { EventItem } from './event-manager';
import { Database } from './storage';
declare class SimpleQueueServer {
    static Database: typeof Database;
    private readonly eventManager;
    constructor({ requestTasks, database, config, cronInterval }: {
        requestTasks?: Array<string>;
        database?: Database;
        config?: any;
        cronInterval?: string;
    });
    generateRoutes(): any;
    queueComparator(queueName: string, value: (event1: EventItem, event2: EventItem) => boolean): void;
    resetAll(): any;
    cancel(): void;
}
export { SimpleQueueServer };
