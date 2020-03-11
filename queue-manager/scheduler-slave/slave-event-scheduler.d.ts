import { EventItem } from '../event-manager';
declare class SlaveEventScheduler {
    static Config: {
        MAX_COUNT: number;
    };
    private readonly queueName;
    private config;
    private queueManagerConfig;
    constructor(queueName: string, listener: (item: EventItem) => Promise<void>, cronInterval?: string);
    private initialize;
    private checkIfMoreItemsCanBeProcessed;
    private requestEventToProcess;
}
export { SlaveEventScheduler };
