import { ARN, EventItem } from '../../../client';
import { FifoQueue } from './processing-queue/fifo-queue';
import { PriorityQueue } from './processing-queue/priority-queue';
import { QueueAdapter } from './processing-queue/queue-adapter';

class SQSQueue {
  private _notifyNeedTaskURLS: Array<string> = [];

  private _queueARNEventIds: { [key: string]: { [key: string]: EventItem } } = {};

  private _queueARN: { [key: string]: QueueAdapter } = {};

  comparatorFunction(queueARN: ARN, value: (event1: EventItem, event2: EventItem) => boolean): void {
    this.priorityQueue(queueARN).setComparatorFunction(value);
    this.reset(queueARN);
  }

  set notifyNeedTaskURLS(value: Array<string>) {
    this._notifyNeedTaskURLS = value;
  }

  get notifyNeedTaskURLS(): Array<string> {
    return this._notifyNeedTaskURLS;
  }

  eventIds(queueARN: ARN): { [key: string]: EventItem } {
    if (!this._queueARNEventIds[queueARN]) {
      this._queueARNEventIds[queueARN] = {};
    }
    return this._queueARNEventIds[queueARN];
  }

  add(item: EventItem): void {
    this.eventIds(item.queueARN)[item.id] = item;
    this.priorityQueue(item.queueARN).add(item);
  }

  isEventPresent(eventItem: EventItem): boolean {
    return typeof this.eventIds(eventItem.queueARN)[eventItem.id] !== 'undefined';
  }

  findEventInQueue(queueARN: ARN, eventItem: EventItem): EventItem {
    return this.eventIds(queueARN)[eventItem.id];
  }

  popInitiate(queueARN: ARN): EventItem {
    return this.priorityQueue(queueARN).poll();
  }

  popComplete(eventItem: EventItem): void {
    delete this.eventIds(eventItem.queueARN)[eventItem.id];
  }

  reset(queueARN: ARN): void {
    this.priorityQueue(queueARN).reset();
    delete this._queueARNEventIds[queueARN];
  }

  resetAll(): void {
    this._queueARN = {};
    this._queueARNEventIds = {};
  }

  size(queueARN: ARN): number {
    return this.priorityQueue(queueARN).size();
  }

  queueARNs(): Array<string> {
    return Object.keys(this._queueARNEventIds);
  }

  private priorityQueue(queueARN: ARN): QueueAdapter {
    if (!this._queueARN[queueARN]) {
      this._queueARN[queueARN] = queueARN.endsWith('.fifo')
        ? new FifoQueue()
        : new PriorityQueue();
    }
    return this._queueARN[queueARN];
  }
}

export { SQSQueue };
