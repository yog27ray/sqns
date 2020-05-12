import { EventItem } from '../../index';
import { StorageEngine } from '../storage';
declare class StorageToQueueWorker {
    private _listener;
    private _workerInterval;
    private _storageEngine;
    private _addEventToQueueListener;
    constructor(storageEngine: StorageEngine, addEventToQueueListener: (queueName: string, eventItem: EventItem) => void);
    setUpIntervalForQueue(queueName: string): void;
    startProcessingOfQueue(queueName: string): void;
    private setUpInterval;
    private baseParams;
    private setUpListener;
}
export { StorageToQueueWorker };
