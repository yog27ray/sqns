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
    private priorityQueue;
    add(queueName: string, item: EventItem): void;
    isEventPresent(queueName: string, eventItem: EventItem): boolean;
    pop(queueName: string): EventItem;
    size(queueName: string): number;
    queueNames(): Array<string>;
}
export { EventQueue };
//# sourceMappingURL=event-queue.d.ts.map