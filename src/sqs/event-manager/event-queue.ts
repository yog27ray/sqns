import { EventItem } from './event-item';
import { FifoQueue } from './processing-queue/fifo-queue';
import { PriorityQueue } from './processing-queue/priority-queue';
import { QueueAdapter } from './processing-queue/queue-adapter';

class EventQueue {
  private _notifyNeedTaskURLS: Array<string> = [];

  private _queueNameEventIds: { [key: string]: { [key: string]: EventItem } } = {};

  private _queueName: { [key: string]: QueueAdapter } = {};

  comparatorFunction(queueName: string, value: (event1: EventItem, event2: EventItem) => boolean): void {
    this.priorityQueue(queueName).setComparatorFunction(value);
    this.reset(queueName);
  }

  set notifyNeedTaskURLS(value: Array<string>) {
    this._notifyNeedTaskURLS = value;
  }

  get notifyNeedTaskURLS(): Array<string> {
    return this._notifyNeedTaskURLS;
  }

  eventIds(queueName: string): { [key: string]: EventItem } {
    if (!this._queueNameEventIds[queueName]) {
      this._queueNameEventIds[queueName] = {};
    }
    return this._queueNameEventIds[queueName];
  }

  add(queueName: string, item: EventItem): void {
    this.eventIds(queueName)[item.id] = item;
    this.priorityQueue(queueName).add(item);
  }

  isEventPresent(queueName: string, eventItem: EventItem): boolean {
    return typeof this.eventIds(queueName)[eventItem.id] !== 'undefined';
  }

  findEventInQueue(queueName: string, eventItem: EventItem): EventItem {
    return this.eventIds(queueName)[eventItem.id];
  }

  pop(queueName: string): EventItem {
    const item = this.priorityQueue(queueName).poll();
    delete this.eventIds(queueName)[item.id];
    return item;
  }

  reset(queueName: string): void {
    this.priorityQueue(queueName).reset();
    delete this._queueNameEventIds[queueName];
  }

  resetAll(): void {
    this._queueName = {};
    this._queueNameEventIds = {};
  }

  size(queueName: string): number {
    return this.priorityQueue(queueName).size();
  }

  queueNames(): Array<string> {
    return Object.keys(this._queueNameEventIds);
  }

  private priorityQueue(queueName: string): QueueAdapter {
    if (!this._queueName[queueName]) {
      this._queueName[queueName] = queueName.endsWith('.fifo')
        ? new FifoQueue()
        : new PriorityQueue();
    }
    return this._queueName[queueName];
  }
}

export { EventQueue };
