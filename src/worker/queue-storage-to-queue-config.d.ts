declare class QueueStorageToQueueConfig {
    private _sending;
    private _baseParams;
    private _listener;
    private _queueName;
    get sending(): boolean;
    set sending(value: boolean);
    get baseParams(): any;
    set baseParams(value: any);
    get listener(): (queueName: string, nextItemListParams: object) => Promise<[object, boolean]>;
    set listener(value: (queueName: string, nextItemListParams: object) => Promise<[object, boolean]>);
    get queueName(): string;
    set queueName(value: string);
}
export { QueueStorageToQueueConfig };
