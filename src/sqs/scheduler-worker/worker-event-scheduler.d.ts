import SQS from 'aws-sdk/clients/sqs';
import { ResponseItem } from '../request-response-types/response-item';
declare class WorkerEventScheduler {
    private Config;
    private client;
    private readonly queueName;
    private job;
    private config;
    private queue;
    constructor(options: SQS.ClientConfiguration, queueName: string, listener: (item: ResponseItem) => Promise<string>, cronInterval?: string);
    setParallelProcessingCount(count: number): void;
    cancel(): void;
    private initialize;
    private checkIfMoreItemsCanBeProcessed;
    private findOrCreateQueue;
    private requestEventToProcess;
    private processEvent;
}
export { WorkerEventScheduler };
