import { ConfigCount } from '../../../../typings/config';
import { ResponseItem } from '../../../../typings/response-item';
import { CreateQueueResult } from '../../../../typings/typings';
declare class WorkerQueueConfig {
    private readonly _queueName;
    private _config;
    private _polling;
    private _hasMore;
    private _queue;
    private _listener;
    constructor(queueName: string);
    get queueName(): string;
    get config(): ConfigCount;
    get polling(): boolean;
    set polling(value: boolean);
    get queue(): CreateQueueResult;
    set queue(value: CreateQueueResult);
    get listener(): (queueName: string, item: ResponseItem) => Promise<string>;
    set listener(value: (queueName: string, item: ResponseItem) => Promise<string>);
    get hasMore(): boolean;
    set hasMore(value: boolean);
}
export { WorkerQueueConfig };
