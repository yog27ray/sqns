/* tslint:disable:no-empty */
import { EventItem } from '../index';
/* eslint-disable @typescript-eslint/no-empty-function */
import { QueueAdapter } from './queue-adapter';

class FifoQueue implements QueueAdapter {
  private _queue: Array<EventItem> = [];

  setComparatorFunction(): void {}

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
