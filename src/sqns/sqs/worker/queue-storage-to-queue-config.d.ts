import { BASE_CONFIG, KeyValue } from '../../../../typings/common';
import { QueueStorageToQueueConfigListener } from '../../../../typings/config';
import { Queue } from '../../common/model/queue';
export declare class QueueStorageToQueueConfig {
    private _sending;
    private _baseParams;
    private _listener;
    private _queues;
    private _knownQueueARN;
    get sending(): boolean;
    set sending(value: boolean);
    get baseParams(): BASE_CONFIG;
    set baseParams(value: BASE_CONFIG);
    get listener(): QueueStorageToQueueConfigListener;
    set listener(value: QueueStorageToQueueConfigListener);
    get queues(): Array<Queue>;
    set queues(value: Array<Queue>);
    get knownQueueARN(): KeyValue<boolean>;
    get cloneBaseParams(): KeyValue;
}
