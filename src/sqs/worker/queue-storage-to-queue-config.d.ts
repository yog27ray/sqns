declare class QueueStorageToQueueConfig {
    private _sending;
    private _baseParams;
    private _listener;
    private _queueName;
    get sending(): boolean;
    set sending(value: boolean);
    get baseParams(): {
        [key: string]: any;
    } | (() => {
        [key: string]: any;
    });
    set baseParams(value: {
        [key: string]: any;
    } | (() => {
        [key: string]: any;
    }));
    get listener(): (queueName: string, nextItemListParams: {
        [key: string]: any;
    }) => Promise<[{
        [key: string]: any;
    }, boolean]>;
    set listener(value: (queueName: string, nextItemListParams: {
        [key: string]: any;
    }) => Promise<[{
        [key: string]: any;
    }, boolean]>);
    get queueName(): string;
    set queueName(value: string);
}
export { QueueStorageToQueueConfig };
