import { SQNSClientConfig } from '../../../../typings/client-confriguation';
import { ResponseItem } from '../../../../typings/response-item';
import { WorkerQueueConfig } from './worker-queue-config';
declare class WorkerEventScheduler {
    private readonly queueNames;
    private sqnsClient;
    private readonly queueConfigs;
    private job;
    constructor(options: SQNSClientConfig, queueNames: Array<string>, listener: (queueName: string, item: ResponseItem) => Promise<string>, cronInterval?: string);
    cancel(): void;
    processSnsEvents(workerQueueConfig: WorkerQueueConfig, responseItem: ResponseItem): Promise<string>;
    snsQueueEventScanSubscription(workerQueueConfig: WorkerQueueConfig, responseItem: ResponseItem): Promise<string>;
    snsQueueEventProcessSubscription(responseItem: ResponseItem): Promise<string>;
    private initialize;
    private checkIfMoreItemsCanBeProcessed;
    private findOrCreateQueue;
    private requestEventToProcessAsynchronous;
    private requestEventToProcess;
    private processEvent;
}
export { WorkerEventScheduler };
