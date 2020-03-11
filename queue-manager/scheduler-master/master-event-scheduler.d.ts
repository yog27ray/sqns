declare class MasterEventScheduler {
    private queueName;
    private config;
    private queueManagerConfig;
    constructor(queueName: string, baseParams: any, listener: (nextItemListParams: any) => Promise<[object, Array<any>]>, cronInterval?: string);
    private initialize;
    private get cloneBaseParams();
    private requestEventsToAddInQueue;
}
export { MasterEventScheduler };
