import { EventItem } from '../../../common/model/event-item';
import { QueueAdapter } from './queue-adapter';
declare class FifoQueue implements QueueAdapter {
    private _queue;
    setComparatorFunction(): void;
    add(item: EventItem): void;
    poll(): EventItem;
    size(): number;
    reset(): void;
}
export { FifoQueue };
