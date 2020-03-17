import { EventItem } from '../event-manager';
declare class SlaveEventScheduler {
    static Config: {
        MAX_COUNT: number;
    };
    private readonly hostName;
    private readonly queueName;
    private job;
    private config;
    constructor(hostName: string, queueName: string, listener: (item: EventItem) => Promise<void>, cronInterval?: string);
    private initialize;
    private checkIfMoreItemsCanBeProcessed;
    private requestEventToProcess;
    cancel(): void;
}
export { SlaveEventScheduler };
