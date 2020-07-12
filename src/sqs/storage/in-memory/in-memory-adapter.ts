import { v4 as uuid } from 'uuid';
import { EventItem } from '../../../../index';
import { EventState } from '../../event-manager/event-item';
import { Queue } from '../../event-manager/queue';
import { StorageAdapter } from '../storage-adapter';

class InMemoryAdapter implements StorageAdapter {
  private _config: any;

  private _db: { [key: string]: { list: Array<EventItem>; queue: Queue } } = {};

  constructor(config: any) {
    this._config = config;
  }

  addEventItem(queue: Queue, item: EventItem): Promise<EventItem> {
    const insertedItem: EventItem = item.clone();
    const queueList = this.getDBQueue(queue.name);
    if (item.id) {
      const queueItem = queueList.find((existingItem: any) => insertedItem.id === existingItem.id);
      if (queueItem) {
        return Promise.resolve(queueItem.clone());
      }
    }
    queueList.push(insertedItem);
    return Promise.resolve(insertedItem.clone());
  }

  findEventsToProcess(queue: Queue, time: Date): Promise<Array<any>> {
    const eventsToProcess = [];
    const queueList = this.getDBQueue(queue.name);
    for (let i = queueList.length - 1; i >= 0; i -= 1) {
      if (queue[i].eventTime.getTime() <= time.getTime()) {
        eventsToProcess.push(queueList[i]);
      }
    }
    return Promise.resolve(eventsToProcess.sort((item1: any, item2: any) => {
      const value1 = item1.eventTime.getTime();
      const value2 = item2.eventTime.getTime();
      if (value1 === value2) {
        return 0;
      }
      if (value1 > value2) {
        return 1;
      }
      return -1;
    }));
  }

  getQueues(): Promise<Array<Queue>> {
    return Promise.resolve(Object.keys(this._db).map((each: string) => this._db[each].queue));
  }

  async updateEvent(id: string, data: object): Promise<void> {
    const eventItem = await this.findById(id);
    Object.keys(data).forEach((key: string) => eventItem[key] = data[key]);
    if (eventItem.state === EventState.SUCCESS || eventItem.receiveCount >= eventItem.maxReceiveCount) {
      const queue = Object.values(this._db).find((each: any) => each.list.includes(eventItem));
      queue.list = queue.list.filter((each: EventItem) => (each !== eventItem));
    }
  }

  findById(id: string): Promise<EventItem> {
    const allEvents = [];
    Object.values(this._db).forEach((each: any) => allEvents.push(...each.list));
    return Promise.resolve(allEvents.find((each: EventItem) => each.id === id));
  }

  createQueue(queueName: string, attributes: object, tag: object): Promise<Queue> {
    this._createQueue(queueName, attributes, tag);
    return Promise.resolve(this._db[queueName].queue);
  }

  getQueue(queueName: string): Promise<Queue> {
    if (!this._db[queueName]) {
      return undefined;
    }
    return Promise.resolve(this._db[queueName].queue.clone());
  }

  deleteQueue(queue: Queue): Promise<void> {
    delete this._db[queue.name];
    return Promise.resolve();
  }

  private _createQueue(queueName: string, attributes: object, tags: object): any {
    if (!this._db[queueName]) {
      const queue = new Queue({ id: uuid(), attributes, name: queueName, tags });
      this._db[queueName] = { list: [], queue };
    }
  }

  private getDBQueue(queueName: string): Array<EventItem> {
    return this._db[queueName].list;
  }
}

export { InMemoryAdapter };
