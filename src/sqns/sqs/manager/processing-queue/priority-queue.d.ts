import { EventItem } from '../../../common/model/event-item';
import { QueueAdapter } from './queue-adapter';
declare class PriorityQueue implements QueueAdapter {
    private _queue;
    private _comparator;
    private _default;
    constructor();
    setComparatorFunction(comparatorFunction: (event1: EventItem, event2: EventItem) => boolean): void;
    poll(): EventItem;
    add(item: EventItem): void;
    size(): number;
    reset(): void;
}
export { PriorityQueue };
