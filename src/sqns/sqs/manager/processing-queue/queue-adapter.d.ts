import { EventItem } from '../../../common/model/event-item';
interface QueueAdapter {
    setComparatorFunction(comparatorFunction: (event1: EventItem, event2: EventItem) => boolean): void;
    poll(): EventItem;
    add(item: EventItem): void;
    size(): number;
    reset(): void;
}
export { QueueAdapter };
