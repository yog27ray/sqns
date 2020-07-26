import { EventItem } from '../index';
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
