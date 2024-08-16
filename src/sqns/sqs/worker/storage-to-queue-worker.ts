import { EventItem, KeyValue } from '@sqns-client';
import { QueueStorageToQueueConfigListener } from '../../../../typings/config';
import { SQSStorageEngine } from '../manager/s-q-s-storage-engine';
import { QueueStorageToQueueScheduler } from './queue-storage-to-queue-scheduler';

class StorageToQueueWorker {
  private readonly cronInterval: string;

  private _listener: QueueStorageToQueueConfigListener;

  private _storageEngine: SQSStorageEngine;

  private _queueStorageToQueueScheduler: QueueStorageToQueueScheduler;

  private readonly _addEventToQueueListener: (eventItem: EventItem) => void;

  constructor(storageEngine: SQSStorageEngine, addEventToQueueListener: (eventItem: EventItem) => void,
    cronInterval: string) {
    this._storageEngine = storageEngine;
    this._addEventToQueueListener = addEventToQueueListener;
    this.cronInterval = cronInterval;
    this.setUpListener();
    this.setUpIntervalForQueue();
  }

  setUpIntervalForQueue(): void {
    this._queueStorageToQueueScheduler = new QueueStorageToQueueScheduler(
      this.baseParams(),
      this._listener,
      this.cronInterval);
  }

  cancel(): void {
    this._queueStorageToQueueScheduler.cancel();
    this._queueStorageToQueueScheduler = undefined;
  }

  private baseParams(): () => Record<string, unknown> {
    return (): Record<string, unknown> => ({ time: new Date() });
  }

  private setUpListener(): void {
    this._listener = async ({ time }: KeyValue): Promise<[KeyValue, boolean]> => {
      const items = await this._storageEngine.findEventsToProcess(time as Date, 100);
      if (!items.length) {
        return [{}, false];
      }
      items.forEach((item: EventItem) => this._addEventToQueueListener(item));
      return [{ time: items[items.length - 1].eventTime }, true];
    };
  }
}

export { StorageToQueueWorker };
