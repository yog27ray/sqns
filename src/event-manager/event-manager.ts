import debug from 'debug';
import { inject, injectable } from 'inversify';
import rp from 'request-promise';
import { Database, StorageEngine } from '../storage';
import { StorageToQueueWorker } from '../worker/storage-to-queue-worker';
import { EventItem } from './event-item';
import { EventQueue } from './event-queue';

const log = debug('ms-queue:EventManager');

@injectable()
class EventManager {
  static readonly Database = Database;

  private static DEFAULT_PRIORITIES = { PRIORITY_TOTAL: 0 };

  private _storageEngine: StorageEngine;

  private storageToQueueWorker: StorageToQueueWorker;

  get eventStats(): object {
    const priorityStats = JSON.parse(JSON.stringify(EventManager.DEFAULT_PRIORITIES));
    const queueNames = this.eventQueue.queueNames();
    queueNames.forEach((queueName: string) => {
      Object.values(this.eventQueue.eventIds(queueName)).forEach((priority: number) => {
        if (!priorityStats[queueName]) {
          priorityStats[queueName] = { PRIORITY_TOTAL: 0 };
        }
        const statKey = `PRIORITY_${priority}`;
        EventManager.DEFAULT_PRIORITIES[statKey] = 0;
        if (!EventManager.DEFAULT_PRIORITIES[queueName]) {
          EventManager.DEFAULT_PRIORITIES[queueName] = { PRIORITY_TOTAL: 0 };
        }
        EventManager.DEFAULT_PRIORITIES[queueName][statKey] = 0;

        priorityStats[queueName][statKey] = (priorityStats[queueName][statKey] || 0) + 1;
        priorityStats[queueName].PRIORITY_TOTAL += 1;
        priorityStats[statKey] = (priorityStats[statKey] || 0) + 1;
        priorityStats.PRIORITY_TOTAL += 1;
      });
    });
    return priorityStats;
  }

  get prometheus(): string {
    const unixTimeStamp = new Date().getTime();
    const prometheusRows = [];
    const priorityStats = this.eventStats;
    Object.keys(priorityStats).forEach((queueName: string) => {
      if (typeof priorityStats[queueName] === 'object') {
        Object.keys(priorityStats[queueName]).forEach((key: string) => {
          prometheusRows.push(`${queueName}_queue_priority{label="${key}"} ${priorityStats[queueName][key]} ${unixTimeStamp}`);
        });
        return;
      }
      prometheusRows.push(`queue_priority{label="${queueName}"} ${priorityStats[queueName]} ${unixTimeStamp}`);
    });
    return `${prometheusRows.sort().join('\n')}\n`;
  }

  constructor(@inject(EventQueue) private eventQueue: EventQueue) {
  }

  setStorageEngine(database: Database, config: any = {}): void {
    this._storageEngine = new StorageEngine(database, config);
    this.storageToQueueWorker = new StorageToQueueWorker(this._storageEngine, this.addEventInQueueListener);
  }

  initialize(notifyNeedTaskURLS: Array<string> = []): void {
    this.eventQueue.notifyNeedTaskURLS = notifyNeedTaskURLS;
  }

  comparatorFunction(queueName: string, value: (event1: EventItem, event2: EventItem) => boolean): void {
    this.eventQueue.comparatorFunction(queueName, value);
  }

  async add(queueName: string, eventItem: EventItem): Promise<any> {
    this.storageToQueueWorker.setUpIntervalForQueue(queueName);
    const insertedEventItem = await this._storageEngine.addEventItem(queueName, eventItem);
    if (insertedEventItem.eventTime.getTime() <= new Date().getTime()) {
      this.storageToQueueWorker.startProcessingOfQueue(queueName);
    }
    this.addToPriorities(queueName, insertedEventItem.priority);
  }

  async poll(queueName: string): Promise<EventItem> {
    if (!this.eventQueue.size(queueName)) {
      this.notifyTaskNeeded(queueName)
        .catch((error: any) => log(error));
      return undefined;
    }
    const eventItem = this.eventQueue.pop(queueName);
    await this._storageEngine.updateEventStateProcessing(queueName, eventItem.id, 'sent to slave');
    return eventItem;
  }

  reset(queueName: string): void {
    delete EventManager.DEFAULT_PRIORITIES[queueName];
    return this.eventQueue.reset(queueName);
  }

  resetAll(preservePriorityName: boolean = true): void {
    if (!preservePriorityName) {
      EventManager.DEFAULT_PRIORITIES = { PRIORITY_TOTAL: 0 };
    }
    return this.eventQueue.resetAll();
  }

  async updateEventStateSuccess(queueName: string, id: string, data: any): Promise<any> {
    await this._storageEngine.updateEventStateSuccess(queueName, id, data);
  }

  async updateEventStateFailure(queueName: string, id: string, data: any): Promise<any> {
    await this._storageEngine.updateEventStateFailure(queueName, id, data);
  }

  private addEventInQueueListener: (queueName: string, item: EventItem) => void = (queueName: string, item: EventItem) => {
    this.addItemInQueue(queueName, item);
  }

  private addItemInQueue(queueName: string, eventItem: EventItem): void {
    if (this.eventQueue.isEventPresent(queueName, eventItem)) {
      return;
    }
    this.eventQueue.add(queueName, eventItem);
  }

  private async notifyTaskNeeded(queueName: string, index: number = 0): Promise<any> {
    try {
      const url = this.eventQueue.notifyNeedTaskURLS[index];
      if (!url) {
        return;
      }
      await rp(url);
    } catch (error) {
      log(error);
    }
    await this.notifyTaskNeeded(queueName, index + 1);
  }

  private addToPriorities(queueName: string, priority: number): void {
    const statKey = `PRIORITY_${priority}`;
    if (!EventManager.DEFAULT_PRIORITIES[statKey]) {
      EventManager.DEFAULT_PRIORITIES[statKey] = 0;
    }
    if (!EventManager.DEFAULT_PRIORITIES[queueName]) {
      EventManager.DEFAULT_PRIORITIES[queueName] = { PRIORITY_TOTAL: 0 };
    }
    if (!EventManager.DEFAULT_PRIORITIES[queueName][statKey]) {
      EventManager.DEFAULT_PRIORITIES[queueName][statKey] = 0;
    }
  }
}

export { EventManager, EventItem };
