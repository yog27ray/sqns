import { BASE_CONFIG, KeyValue } from '../../../../typings/common';
import { QueueStorageToQueueConfigListener } from '../../../../typings/config';
export declare class QueueStorageToQueueConfig {
    private _sending;
    private _baseParams;
    private _listener;
    get sending(): boolean;
    set sending(value: boolean);
    get baseParams(): BASE_CONFIG;
    set baseParams(value: BASE_CONFIG);
    get listener(): QueueStorageToQueueConfigListener;
    set listener(value: QueueStorageToQueueConfigListener);
    get cloneBaseParams(): KeyValue;
}
