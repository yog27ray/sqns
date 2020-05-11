import { StorageAdapter } from '../storage-adapter';

class InMemoryAdapter implements StorageAdapter {
  private _config: any;

  private _db: { [key: string]: Array<any> } = {};

  constructor(config: any) {
    this._config = config;
  }

  addEventItem(queueName: string, item: object): Promise<any> {
    this.getDBQueue(queueName).push(item);
    return Promise.resolve(item);
  }

  findEventsToProcess(queueName: string, time: Date): Promise<Array<any>> {
    const eventsToProcess = [];
    const queue = this.getDBQueue(queueName);
    for (let i = queue.length - 1; i >= 0; i -= 1) {
      if (queue[i].eventTime.getTime() <= time.getTime()) {
        eventsToProcess.push(queue.splice(i, 1)[0]);
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

  getQueueNames(): Promise<Array<string>> {
    return Promise.resolve(Object.keys(this._db));
  }

  updateEvent(queueName: string, id: string, data: object): Promise<any> {
    return Promise.resolve(data);
  }

  private getDBQueue(queueName: string): Array<any> {
    if (!this._db[queueName]) {
      this._db[queueName] = [];
    }
    return this._db[queueName];
  }
}

export { InMemoryAdapter };
