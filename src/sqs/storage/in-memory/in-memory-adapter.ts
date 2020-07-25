import { v4 as uuid } from 'uuid';
import { EventItem } from '../../../../index';
import { EventState } from '../../event-manager/event-item';
import { Queue } from '../../event-manager/queue';
import { StorageAdapter } from '../storage-adapter';

class InMemoryAdapter implements StorageAdapter {
  private _config: { [key: string]: any };

  private _db: { [key: string]: { list: Array<EventItem>; queue: Queue } } = {};

  constructor(config: { [key: string]: any }) {
    this._config = config;
  }

  addEventItem(queue: Queue, item: EventItem): Promise<EventItem> {
    const insertedItem: EventItem = item.clone();
    const queueList = this.getDBQueue(queue.name);
    if (item.id) {
      const queueItem = queueList.find((existingItem: { [key: string]: any }) => insertedItem.id === existingItem.id);
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
      if (queueList[i].eventTime.getTime() <= time.getTime()) {
        eventsToProcess.push(queueList[i]);
      }
    }
    return Promise.resolve(eventsToProcess.sort((item1: { [key: string]: any, eventTime: Date },
      item2: { [key: string]: any, eventTime: Date }) => {
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

  getQueues(queueNamePrefix: string = ''): Promise<Array<Queue>> {
    return Promise.resolve(Object.keys(this._db).filter((each: string) => each.startsWith(queueNamePrefix))
      .map((each: string) => this._db[each].queue));
  }

  async updateEvent(id: string, data: { [key: string]: any }): Promise<void> {
    const eventItem = await this.findById(id);
    Object.keys(data).forEach((key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      eventItem[key] = data[key];
    });
    if (eventItem.state === EventState.SUCCESS || eventItem.receiveCount >= eventItem.maxReceiveCount) {
      const queue = Object.values(this._db).find((each: { list: Array<EventItem> }) => each.list.includes(eventItem));
      queue.list = queue.list.filter((each: EventItem) => (each !== eventItem));
    }
  }

  findById(id: string): Promise<EventItem> {
    const allEvents = [];
    Object.values(this._db).forEach((each: { list: Array<EventItem> }) => allEvents.push(...each.list));
    return Promise.resolve<EventItem>(allEvents.find((each: EventItem) => each.id === id));
  }

  createQueue(queueName: string, attributes: { [key: string]: any }, tag: { [key: string]: any }): Promise<Queue> {
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

  private _createQueue(queueName: string, attributes: { [key: string]: any }, tags: { [key: string]: any }): any {
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
