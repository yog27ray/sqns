import { EventItem } from '../event-manager';
declare class MasterEventScheduler {
    private readonly queueName;
    private readonly hostName;
    private job;
    private config;
    private msQueueRequestHandler;
    constructor(hostName: string, queueName: string, baseParams: any, listener: (nextItemListParams: any) => Promise<[object, Array<EventItem>]>, cronInterval?: string);
    cancel(): void;
    private initialize;
    private get cloneBaseParams();
    private requestEventsToAddInQueue;
}
export { MasterEventScheduler };
