import FastPriorityQueue from 'fastpriorityqueue';
import { EventItem } from '../event-item';
import { QueueAdapter } from './queue-adapter';

class PriorityQueue implements QueueAdapter {
  private _queue: FastPriorityQueue<EventItem>;

  private _comparator: (event1: EventItem, event2: EventItem) => boolean;

  private _default: (event1: EventItem, event2: EventItem) => boolean;

  constructor() {
    this._comparator = (event1: EventItem, event2: EventItem): boolean => (event1.priority < event2.priority);
    this._default = this._comparator;
    this.reset();
  }

  setComparatorFunction(comparatorFunction: (event1: EventItem, event2: EventItem) => boolean): void {
    if (!comparatorFunction) {
      return;
    }
    this._comparator = comparatorFunction;
  }

  poll(): EventItem {
    return this._queue.poll();
  }

  add(item: EventItem): void {
    this._queue.add(item);
  }

  size(): number {
    return this._queue.size;
  }

  reset(): void {
    this._queue = new FastPriorityQueue<EventItem>((event1: EventItem, event2: EventItem): boolean => (
      this._comparator(event1, event2)));
  }
}

export { PriorityQueue };
