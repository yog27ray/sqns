import FastPriorityQueue from 'fastpriorityqueue';
import { injectable } from 'inversify';
// tslint:disable-next-line:no-import-side-effect
import 'reflect-metadata';
import { EventItem } from './event-item';

@injectable()
class EventQueue {
  private readonly _comparatorFunctionMap: { [key: string]: (event1: EventItem, event2: EventItem) => boolean };

  private readonly _defaultComparatorFunction: (event1: EventItem, event2: EventItem) => boolean;

  private _notifyNeedTaskURLS: Array<string> = [];

  private _queueNameEventIds: { [key: string]: { [key: string]: number } } = {};

  private _queueName: { [key: string]: FastPriorityQueue<EventItem> } = {};

  constructor() {
    this._comparatorFunctionMap = {};
    this._defaultComparatorFunction = (event1: EventItem, event2: EventItem): boolean => (event1.priority < event2.priority);
  }

  comparatorFunction(queueName: string, value: (event1: EventItem, event2: EventItem) => boolean): void {
    this._comparatorFunctionMap[queueName] = value;
    this.reset(queueName);
  }

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

  private priorityQueue(queueName: string): FastPriorityQueue<EventItem> {
    if (!this._queueName[queueName]) {
      this._queueName[queueName] = new FastPriorityQueue<EventItem>(
        (event1: EventItem, event2: EventItem): boolean => {
          if (this._comparatorFunctionMap[queueName]) {
            return this._comparatorFunctionMap[queueName](event1, event2);
          }
          return this._defaultComparatorFunction(event1, event2);
        });
    }
    return this._queueName[queueName];
  }
}

export { EventQueue };
