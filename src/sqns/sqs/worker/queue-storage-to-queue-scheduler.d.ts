import { BASE_CONFIG } from '../../../../typings/common';
import { QueueStorageToQueueConfigListener } from '../../../../typings/config';
export declare class QueueStorageToQueueScheduler {
    private _job;
    private config;
    constructor(baseParams: BASE_CONFIG, listener: QueueStorageToQueueConfigListener, cronInterval?: string);
    cancel(): void;
    private startProcessingOfQueue;
    private findEventsToAddInQueueAsynchronous;
    private findEventsToAddInQueue;
}
