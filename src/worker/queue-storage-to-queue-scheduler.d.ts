declare class QueueStorageToQueueScheduler {
    private _job;
    private config;
    constructor(queueName: string, baseParams: () => object, listener: (queueName: string, nextItemListParams: any) => Promise<[object, boolean]>, cronInterval?: string);
    startProcessingOfQueue(): void;
    cancel(): void;
    private get cloneBaseParams();
    private findEventsToAddInQueue;
}
export { QueueStorageToQueueScheduler };
