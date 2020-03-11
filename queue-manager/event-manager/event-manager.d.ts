import { EventQueue } from './event-queue';
import { EventItem } from './event-item';
declare class EventManager {
    private eventQueue;
    get eventStats(): object;
    get prometheus(): string;
    constructor(eventQueue: EventQueue);
    initialize(notifyNeedTaskURLS?: Array<string>): void;
    add(queueName: string, eventItem: EventItem): void;
    poll(queueName: string): EventItem;
    private notifyTaskNeeded;
}
export { EventManager, EventItem };
