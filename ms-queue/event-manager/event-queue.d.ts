import 'reflect-metadata';
import { EventItem } from './event-item';
declare class EventQueue {
    private _notifyNeedTaskURLS;
    private _queueNameEventIds;
    private _queueName;
    set notifyNeedTaskURLS(value: Array<string>);
    get notifyNeedTaskURLS(): Array<string>;
    eventIds(queueName: string): {
        [key: string]: number;
    };
    add(queueName: string, item: EventItem): void;
    isEventPresent(queueName: string, eventItem: EventItem): boolean;
    pop(queueName: string): EventItem;
    reset(queueName: string): void;
    resetAll(): void;
    size(queueName: string): number;
    queueNames(): Array<string>;
    private priorityQueue;
}
export { EventQueue };
