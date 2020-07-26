import debug from 'debug';
import rp from 'request-promise';
import { Database, StorageEngine } from '../storage';
import { StorageToQueueWorker } from '../worker/storage-to-queue-worker';
import { EventItem } from './event-item';
import { EventQueue } from './event-queue';
import { Queue } from './queue';

const log = debug('ms-queue:EventManager');

class EventManager {
  static readonly Database = Database;

  private static DEFAULT_PRIORITIES = { PRIORITY_TOTAL: 0 };

  private _eventQueue: EventQueue;

  private _storageEngine: StorageEngine;

  private storageToQueueWorker: StorageToQueueWorker;

  get eventStats(): { [key: string]: any } {
    const priorityStats = JSON.parse(JSON.stringify(EventManager.DEFAULT_PRIORITIES)) as { [key: string]: any };
    const queueNames = this._eventQueue.queueNames();
    queueNames.forEach((queueName: string) => {
      Object.values(this._eventQueue.eventIds(queueName)).forEach((event: EventItem) => {
        if (!priorityStats[queueName]) {
          priorityStats[queueName] = { PRIORITY_TOTAL: 0 };
        }
        const statKey = `PRIORITY_${event.priority}`;
        EventManager.DEFAULT_PRIORITIES[statKey] = 0;
        if (!EventManager.DEFAULT_PRIORITIES[queueName]) {
          EventManager.DEFAULT_PRIORITIES[queueName] = { PRIORITY_TOTAL: 0 };
        }
        EventManager.DEFAULT_PRIORITIES[queueName][statKey] = 0;

        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        priorityStats[queueName][statKey] = (priorityStats[queueName][statKey] || 0) + 1;
        priorityStats[queueName].PRIORITY_TOTAL += 1;
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        priorityStats[statKey] = (priorityStats[statKey] || 0) + 1;
        priorityStats.PRIORITY_TOTAL += 1;
      });
    });
    return priorityStats;
  }

  prometheus(time: Date = new Date()): string {
    const unixTimeStamp = time.getTime();
    const prometheusRows = [];
    const priorityStats = this.eventStats;
    Object.keys(priorityStats).forEach((queueName: string) => {
      if (typeof priorityStats[queueName] === 'object') {
        const priorityStatsQueueName = priorityStats[queueName] as { [key: string]: number };
        Object.keys(priorityStatsQueueName).forEach((key: string) => {
          prometheusRows.push(`${queueName}_queue_priority{label="${key}"} ${priorityStatsQueueName[key]} ${unixTimeStamp}`);
        });
        return;
      }
      prometheusRows.push(`queue_priority{label="${queueName}"} ${priorityStats[queueName] as number} ${unixTimeStamp}`);
    });
    return `${prometheusRows.sort().join('\n')}\n`;
  }

  constructor() {
    this._eventQueue = new EventQueue();
  }

  setStorageEngine(database: Database, config: { [key: string]: any }): void {
    this._storageEngine = new StorageEngine(database, config);
    this.storageToQueueWorker = new StorageToQueueWorker(this._storageEngine, this.addEventInQueueListener);
  }

  initialize(notifyNeedTaskURLS: Array<string> = []): void {
    this._eventQueue.notifyNeedTaskURLS = notifyNeedTaskURLS;
  }

  comparatorFunction(queueName: string, value: (event1: EventItem, event2: EventItem) => boolean): void {
    this._eventQueue.comparatorFunction(queueName, value);
  }

  async poll(queue: Queue, visibilityTimeout: number): Promise<EventItem> {
    if (!this._eventQueue.size(queue.name)) {
      await Promise.all(this._eventQueue.notifyNeedTaskURLS
        .map(async (url: string) => {
          await rp({ uri: url, method: 'POST', body: { queueName: queue.name } })
        }))
        .catch((error: any) => log(error));
      return undefined;
    }
    const eventItem = this._eventQueue.pop(queue.name);
    await this._storageEngine.updateEventStateProcessing(queue, eventItem, visibilityTimeout, 'sent to slave');
    if (eventItem.eventTime.getTime() <= new Date().getTime()) {
      const event: EventItem = await this._storageEngine.findEvent(eventItem.id);
      if (event && event.receiveCount < event.maxReceiveCount) {
        this.addItemInQueue(queue.name, event);
      }
    }
    return eventItem;
  }

  resetAll(resetOnlyStatistics?: boolean): void {
    EventManager.DEFAULT_PRIORITIES = { PRIORITY_TOTAL: 0 };
    if (resetOnlyStatistics) {
      return;
    }
    this._eventQueue.resetAll();
  }

  async updateEventStateSuccess(queueName: string, id: string, message: string): Promise<any> {
    await this._storageEngine.updateEventState(queueName, id, EventItem.State.SUCCESS, { successResponse: message });
  }

  async updateEventStateFailure(queueName: string, id: string, message: string): Promise<any> {
    await this._storageEngine.updateEventState(queueName, id, EventItem.State.FAILURE, { failureResponse: message });
  }

  listQueues(queueNamePrefix: string): Promise<Array<Queue>> {
    return this._storageEngine.listQueues(queueNamePrefix);
  }

  createQueue(queueName: string, attributes: { [key: string]: any }, tag: { [key: string]: any }): Promise<Queue> {
    return this._storageEngine.createQueue(queueName, attributes, tag);
  }

  getQueue(queueName: string): Promise<Queue> {
    return this._storageEngine.getQueue(queueName);
  }

  async deleteQueue(queueName: string): Promise<void> {
    await this._storageEngine.deleteQueue(queueName);
    this._eventQueue.reset(queueName);
    delete EventManager.DEFAULT_PRIORITIES[queueName];
    if (Object.keys(EventManager.DEFAULT_PRIORITIES).every((key: string) => key.startsWith('PRIORITY_'))) {
      EventManager.DEFAULT_PRIORITIES = { PRIORITY_TOTAL: 0 };
    }
  }

  async sendMessage(queueName: string, MessageBody: string, MessageAttribute: { [key: string]: any },
    MessageSystemAttribute: { [key: string]: any }, DelaySeconds: string = '0',
    MessageDeduplicationId?: string): Promise<EventItem> {
    this.storageToQueueWorker.setUpIntervalForQueue(queueName);
    const queue = await this._storageEngine.getQueue(queueName);
    const eventItem = new EventItem({
      MessageAttribute,
      MessageSystemAttribute,
      MessageBody,
      queueId: queue.id,
      MessageDeduplicationId,
      maxReceiveCount: queue.getMaxReceiveCount(),
      eventTime: new Date(new Date().getTime() + (Number(DelaySeconds) * 1000)),
    });
    const inQueueEvent = this._eventQueue.findEventInQueue(queueName, eventItem);
    if (inQueueEvent) {
      return inQueueEvent;
    }
    const insertedEventItem = await this._storageEngine.addEventItem(queueName, eventItem);
    if (insertedEventItem.eventTime.getTime() <= new Date().getTime()) {
      this.addItemInQueue(queueName, insertedEventItem);
      await this._storageEngine.findEvent(insertedEventItem.id);
    }
    this.addToPriorities(queueName, insertedEventItem.priority);
    return insertedEventItem;
  }

  receiveMessage(queue: Queue, VisibilityTimeout: string = '30', MaxNumberOfMessages: string = '1'): Promise<Array<EventItem>> {
    return this.pollN(queue, Number(VisibilityTimeout), Number(MaxNumberOfMessages));
  }

  private async pollN(queue: Queue, visibilityTimeout: number, size: number): Promise<Array<EventItem>> {
    if (!size) {
      return [];
    }
    const response: EventItem = await this.poll(queue, visibilityTimeout);
    if (!response) {
      return [];
    }
    const responses = await this.pollN(queue, visibilityTimeout, size - 1);
    responses.unshift(response);
    return responses;
  }

  private addEventInQueueListener: (queueName: string, item: EventItem) => void = (queueName: string, item: EventItem) => {
    this.addItemInQueue(queueName, item);
  }

  private addItemInQueue(queueName: string, eventItem: EventItem): void {
    if (this._eventQueue.isEventPresent(queueName, eventItem)) {
      return;
    }
    this._eventQueue.add(queueName, eventItem);
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
