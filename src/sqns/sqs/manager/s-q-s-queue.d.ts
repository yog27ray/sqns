import { ARN } from '../../../../typings';
import { EventItem } from '../../common/model/event-item';
declare class SQSQueue {
    private _notifyNeedTaskURLS;
    private _queueARNEventIds;
    private _queueARN;
    comparatorFunction(queueARN: ARN, value: (event1: EventItem, event2: EventItem) => boolean): void;
    set notifyNeedTaskURLS(value: Array<string>);
    get notifyNeedTaskURLS(): Array<string>;
    eventIds(queueARN: ARN): {
        [key: string]: EventItem;
    };
    add(item: EventItem): void;
    isEventPresent(eventItem: EventItem): boolean;
    findEventInQueue(queueARN: ARN, eventItem: EventItem): EventItem;
    pop(queueARN: ARN): EventItem;
    reset(queueARN: ARN): void;
    resetAll(): void;
    size(queueARN: ARN): number;
    queueARNs(): Array<string>;
    private priorityQueue;
}
export { SQSQueue };
