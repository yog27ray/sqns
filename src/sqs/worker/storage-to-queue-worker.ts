import debug from 'debug';
import { EventItem } from '../../../index';
import { StorageEngine } from '../storage';
import { QueueStorageToQueueScheduler } from './queue-storage-to-queue-scheduler';

const log = debug('sqns:TestServer');

class StorageToQueueWorker {
  private readonly cronInterval: string;

  private _listener: (queueName: string, nextItemListParams: any) => Promise<[{ [key: string]: any }, boolean]>;

  private _workerInterval: { [key: string]: QueueStorageToQueueScheduler } = {};

  private _storageEngine: StorageEngine;

  private readonly _addEventToQueueListener: (queueName: string, eventItem: EventItem) => void;

  constructor(storageEngine: StorageEngine, addEventToQueueListener: (queueName: string, eventItem: EventItem) => void,
    cronInterval: string) {
    this._storageEngine = storageEngine;
    this._addEventToQueueListener = addEventToQueueListener;
    this.cronInterval = cronInterval;
    this.setUpListener();
    this.setUpInterval().catch((error: any) => log(error));
  }

  setUpIntervalForQueue(queueName: string): void {
    if (this._workerInterval[queueName]) {
      return;
    }
    this._workerInterval[queueName] = new QueueStorageToQueueScheduler(
      queueName,
      this.baseParams(),
      this._listener,
      this.cronInterval);
  }

  cancel(): void {
    Object.keys(this._workerInterval).forEach((queueName: string) => {
      this._workerInterval[queueName].cancel();
      delete this._workerInterval[queueName];
    });
  }

  private async setUpInterval(): Promise<any> {
    const queueNames = await this._storageEngine.getQueueNames();
    queueNames.forEach((queueName: string) => this.setUpIntervalForQueue(queueName));
  }

  private baseParams(): () => { [key: string]: any } {
    return (): { [key: string]: any } => ({ time: new Date() });
  }

  private setUpListener(): void {
    this._listener = async (queueName: string, { time }: { time: Date }): Promise<[{ [key: string]: any }, boolean]> => {
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
