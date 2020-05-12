import { EventItem } from '../../index';
import { StorageEngine } from '../storage';
import { QueueStorageToQueueScheduler } from './queue-storage-to-queue-scheduler';

class StorageToQueueWorker {
  private _listener: (queueName: string, nextItemListParams: any) => Promise<[object, boolean]>;

  private _workerInterval: { [key: string]: QueueStorageToQueueScheduler } = {};

  private _storageEngine: StorageEngine;

  private _addEventToQueueListener: (queueName: string, eventItem: EventItem) => void;

  constructor(storageEngine: StorageEngine, addEventToQueueListener: (queueName: string, eventItem: EventItem) => void) {
    this._storageEngine = storageEngine;
    this._addEventToQueueListener = addEventToQueueListener;
    this.setUpListener();
    this.setUpInterval();
  }

  setUpIntervalForQueue(queueName: string): void {
    if (this._workerInterval[queueName]) {
      return;
    }
    this._workerInterval[queueName] = new QueueStorageToQueueScheduler(
      queueName,
      this.baseParams(),
      this._listener);
  }

  startProcessingOfQueue(queueName: string): void {
    this._workerInterval[queueName].startProcessingOfQueue();
  }

  private async setUpInterval(): Promise<any> {
    const queueNames = await this._storageEngine.getQueueNames();
    queueNames.forEach((queueName: string) => this.setUpIntervalForQueue(queueName));
  }

  private baseParams(): () => object {
    return (): object => ({ time: new Date() });
  }

  private setUpListener(): void {
    this._listener = async (queueName: string, { time }: { time: Date }): Promise<[object, boolean]> => {
      const items = await this._storageEngine.findEventsToProcess(queueName, time);
      if (!items.length) {
        return [{}, false];
      }
      items.forEach((item: EventItem) => this._addEventToQueueListener(queueName, item));
      return [{ time: items[items.length - 1].eventTime }, !!items.length];
    };
  }
}

export { StorageToQueueWorker };
