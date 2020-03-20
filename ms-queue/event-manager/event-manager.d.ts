import { EventItem } from './event-item';
import { EventQueue } from './event-queue';
declare class EventManager {
    private eventQueue;
    private static DEFAULT_PRIORITIES;
    get eventStats(): object;
    get prometheus(): string;
    constructor(eventQueue: EventQueue);
    initialize(notifyNeedTaskURLS?: Array<string>): void;
    add(queueName: string, eventItem: EventItem): void;
    poll(queueName: string): EventItem;
    reset(queueName: string): void;
    resetAll(): void;
    private notifyTaskNeeded;
}
export { EventManager, EventItem };
