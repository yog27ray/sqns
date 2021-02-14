import { EventItem } from '../../../common/model/event-item';
import { QueueAdapter } from './queue-adapter';

class FifoQueue implements QueueAdapter {
  private _queue: Array<EventItem> = [];

  setComparatorFunction(): void {
    // comparator function call is ignored here.
  }

  add(item: EventItem): void {
    this._queue.push(item);
  }

  poll(): EventItem {
    return this._queue.pop();
  }

  size(): number {
    return this._queue.length;
  }

  reset(): void {
    this._queue = [];
  }
}

export { FifoQueue };
