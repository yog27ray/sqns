import { BASE_CONFIG, CreateQueueResult, KeyValue } from '../../../../typings/typings';
import { ManagerQueueConfigListener } from '../../../../typings/config';
export declare class ManagerQueueConfig {
    private readonly _queueName;
    private _queue;
    private _sending;
    private _queryBaseParams;
    private _listener;
    constructor(queueName: string);
    get queueName(): string;
    get sending(): boolean;
    set sending(value: boolean);
    get queue(): CreateQueueResult;
    set queue(value: CreateQueueResult);
    get queryBaseParams(): BASE_CONFIG;
    set queryBaseParams(value: BASE_CONFIG);
    get listener(): ManagerQueueConfigListener;
    set listener(value: ManagerQueueConfigListener);
    get cloneBaseParams(): KeyValue;
}
