import { EventItem } from '../event-manager';
declare class MasterEventScheduler {
    private readonly queueName;
    private readonly hostName;
    private job;
    private config;
    constructor(hostName: string, queueName: string, baseParams: any, listener: (nextItemListParams: any) => Promise<[object, Array<EventItem>]>, cronInterval?: string);
    addEventsToQueue(events: Array<EventItem>): Promise<any>;
    cancel(): void;
    private initialize;
    private get cloneBaseParams();
    private requestEventsToAddInQueue;
}
export { MasterEventScheduler };
