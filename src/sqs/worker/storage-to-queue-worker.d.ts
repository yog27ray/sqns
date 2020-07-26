import { EventItem } from '../../../index';
import { StorageEngine } from '../storage';
declare class StorageToQueueWorker {
    private readonly cronInterval;
    private _listener;
    private _workerInterval;
    private _storageEngine;
    private readonly _addEventToQueueListener;
    constructor(storageEngine: StorageEngine, addEventToQueueListener: (queueName: string, eventItem: EventItem) => void, cronInterval: string);
    setUpIntervalForQueue(queueName: string): void;
    cancel(): void;
    private setUpInterval;
    private baseParams;
    private setUpListener;
}
export { StorageToQueueWorker };
