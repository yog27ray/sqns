import { EventItem } from '../../common/model/event-item';
import { SQSStorageEngine } from '../manager/s-q-s-storage-engine';
declare class StorageToQueueWorker {
    private readonly cronInterval;
    private _listener;
    private _storageEngine;
    private _queueStorageToQueueScheduler;
    private readonly _addEventToQueueListener;
    constructor(storageEngine: SQSStorageEngine, addEventToQueueListener: (eventItem: EventItem) => void, cronInterval: string);
    setUpIntervalForQueue(): void;
    cancel(): void;
    private baseParams;
    private setUpListener;
}
export { StorageToQueueWorker };
