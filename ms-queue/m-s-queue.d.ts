import { EventItem } from './event-manager';
declare class MSQueue {
    private eventManager;
    constructor({ requestTasks }?: {
        requestTasks?: Array<string>;
    });
    generateRoutes(): any;
    queueComparator(queueName: string, value: (event1: EventItem, event2: EventItem) => boolean): void;
}
export { MSQueue };
