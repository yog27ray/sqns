import { BASE_CONFIG } from '../../../../typings';
import { QueueStorageToQueueConfigListener } from '../../../../typings/config';
import { Queue } from '../../common/model/queue';
export declare class QueueStorageToQueueScheduler {
    private _job;
    private config;
    constructor(queue: Queue, baseParams: BASE_CONFIG, listener: QueueStorageToQueueConfigListener, cronInterval?: string);
    cancel(): void;
    addQueue(queue: Queue): void;
    private startProcessingOfQueue;
    private findEventsToAddInQueueAsynchronous;
    private findEventsToAddInQueue;
}
