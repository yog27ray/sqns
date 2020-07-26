import { EventItem } from './event-item';
declare class EventQueue {
    private _notifyNeedTaskURLS;
    private _queueNameEventIds;
    private _queueName;
    comparatorFunction(queueName: string, value: (event1: EventItem, event2: EventItem) => boolean): void;
    set notifyNeedTaskURLS(value: Array<string>);
    get notifyNeedTaskURLS(): Array<string>;
    eventIds(queueName: string): {
        [key: string]: EventItem;
    };
    add(queueName: string, item: EventItem): void;
    isEventPresent(queueName: string, eventItem: EventItem): boolean;
    findEventInQueue(queueName: string, eventItem: EventItem): EventItem;
    pop(queueName: string): EventItem;
    reset(queueName: string): void;
    resetAll(): void;
    size(queueName: string): number;
    queueNames(): Array<string>;
    private priorityQueue;
}
export { EventQueue };
