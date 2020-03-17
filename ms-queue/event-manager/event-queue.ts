import 'reflect-metadata';
import FastPriorityQueue from 'fastpriorityqueue';
import { injectable } from 'inversify';
import { EventItem } from './event-item';

@injectable()
class EventQueue {
  private _notifyNeedTaskURLS: Array<string> = [];

  private _queueNameEventIds: { [key: string]: { [key: string]: number } } = {};

  private _queueName: { [key: string]: FastPriorityQueue<EventItem> } = {};

  set notifyNeedTaskURLS(value: Array<string>) {
    this._notifyNeedTaskURLS = value;
  }

  get notifyNeedTaskURLS(): Array<string> {
    return this._notifyNeedTaskURLS;
  }

  eventIds(queueName: string): { [key: string]: number } {
    if (!this._queueNameEventIds[queueName]) {
      this._queueNameEventIds[queueName] = {};
    }
    return this._queueNameEventIds[queueName];
  }

  private priorityQueue(queueName: string): FastPriorityQueue<EventItem> {
    if (!this._queueName[queueName]) {
      this._queueName[queueName] = new FastPriorityQueue<EventItem>(
        (event1: EventItem, event2: EventItem): boolean => (event1.priority < event2.priority));
    }
    return this._queueName[queueName];
  }

  add(queueName: string, item: EventItem): void {
    this.eventIds(queueName)[item.id] = item.priority;
    this.priorityQueue(queueName).add(item);
  }

  isEventPresent(queueName: string, eventItem: EventItem): boolean {
    return typeof this.eventIds(queueName)[eventItem.id] !== 'undefined';
  }

  pop(queueName: string): EventItem {
    const item = this.priorityQueue(queueName).poll();
    delete this.eventIds(queueName)[item.id];
    return item;
  }

  reset(queueName: string): void {
    delete this._queueName[queueName];
    delete this._queueNameEventIds[queueName];
  }

  resetAll(): void {
    this._queueName = {};
    this._queueNameEventIds = {};
  }

  size(queueName: string): number {
    return this.priorityQueue(queueName).size;
  }

  queueNames(): Array<string> {
    return Object.keys(this._queueNameEventIds);
  }
}

export { EventQueue };
