import { EventItem } from '../../common/model/event-item';
import { Queue } from '../../common/model/queue';
import { SQSStorageEngine } from '../manager/s-q-s-storage-engine';
declare class StorageToQueueWorker {
    private readonly cronInterval;
    private _listener;
    private _storageEngine;
    private _queueStorageToQueueScheduler;
    private readonly _addEventToQueueListener;
    constructor(storageEngine: SQSStorageEngine, addEventToQueueListener: (eventItem: EventItem) => void, cronInterval: string);
    setUpIntervalForQueue(queue: Queue): void;
    cancel(): void;
    private setUpInterval;
    private baseParams;
    private setUpListener;
}
export { StorageToQueueWorker };
