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
    fetchEventsFromQueue(): Promise<EventItem>;
    cancel(): void;
    private initialize;
    private checkIfMoreItemsCanBeProcessed;
    private requestEventToProcess;
}
export { SlaveEventScheduler };
