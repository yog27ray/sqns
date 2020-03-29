import { EventItem } from '../event-manager';
declare class ProcessingEventScheduler {
    private Config;
    private readonly hostName;
    private readonly queueName;
    private job;
    private config;
    private msQueueRequestHandler;
    constructor(hostName: string, queueName: string, listener: (item: EventItem) => Promise<void>, cronInterval?: string);
    setParallelProcessingCount(count: number): void;
    cancel(): void;
    private initialize;
    private checkIfMoreItemsCanBeProcessed;
    private requestEventToProcess;
}
export { ProcessingEventScheduler };
