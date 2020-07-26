declare class QueueStorageToQueueScheduler {
    private _job;
    private config;
    constructor(queueName: string, baseParams: () => {
        [key: string]: any;
    }, listener: (queueName: string, nextItemListParams: any) => Promise<[{
        [key: string]: any;
    }, boolean]>, cronInterval?: string);
    cancel(): void;
    private startProcessingOfQueue;
    private get cloneBaseParams();
    private findEventsToAddInQueue;
}
export { QueueStorageToQueueScheduler };
