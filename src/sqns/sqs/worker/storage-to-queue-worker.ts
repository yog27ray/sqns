import { KeyValue } from '../../../../typings/common';
import { QueueStorageToQueueConfigListener } from '../../../../typings/config';
import { logger } from '../../common/logger/logger';
import { EventItem } from '../../common/model/event-item';
import { Queue } from '../../common/model/queue';
import { SQSStorageEngine } from '../manager/s-q-s-storage-engine';
import { QueueStorageToQueueScheduler } from './queue-storage-to-queue-scheduler';

const log = logger.instance('StorageToQueueWorker');

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
    this.setUpInterval().catch((error: any) => {
      log.error(error);
    });
  }

  setUpIntervalForQueue(queue: Queue): void {
    if (!this._queueStorageToQueueScheduler) {
      this._queueStorageToQueueScheduler = new QueueStorageToQueueScheduler(
        queue,
        this.baseParams(),
        this._listener,
        this.cronInterval);
    } else {
      this._queueStorageToQueueScheduler.addQueue(queue);
    }
  }

  cancel(): void {
    this._queueStorageToQueueScheduler.cancel();
    this._queueStorageToQueueScheduler = undefined;
  }

  private async setUpInterval(): Promise<any> {
    const queues = await this._storageEngine.listQueues(undefined);
    queues.forEach((queue: Queue) => this.setUpIntervalForQueue(queue));
  }

  private baseParams(): () => { [key: string]: any } {
    return (): { [key: string]: any } => ({ time: new Date() });
  }

  private setUpListener(): void {
    this._listener = async (queues: Array<Queue>, { time }: KeyValue): Promise<[KeyValue, boolean]> => {
      const items = await this._storageEngine.findEventsToProcess(queues, time as Date, 100);
      if (!items.length) {
        return [{}, false];
      }
      items.forEach((item: EventItem) => this._addEventToQueueListener(item));
      return [{ time: items[items.length - 1].eventTime }, true];
    };
  }
}

export { StorageToQueueWorker };
