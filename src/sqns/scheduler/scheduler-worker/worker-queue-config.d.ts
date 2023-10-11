import { ConfigCount } from '../../../../typings/config';
import { CreateQueueResult } from '../../../../typings/queue';
import { ResponseItem } from '../../../../typings/response-item';
declare class WorkerQueueConfig {
    private readonly _queueName;
    private readonly _config;
    private _polling;
    private _hasMore;
    private _queue;
    private _count;
    private readonly _listener;
    constructor(queueName: string, listener: (queueName: string, item: ResponseItem) => Promise<string>, config?: ConfigCount);
    get queueName(): string;
    get config(): ConfigCount;
    get polling(): boolean;
    set polling(value: boolean);
    get queue(): CreateQueueResult;
    set queue(value: CreateQueueResult);
    get listener(): (queueName: string, item: ResponseItem) => Promise<string>;
    get hasMore(): boolean;
    set hasMore(value: boolean);
    get count(): number;
    incrementCount(): void;
    decrementCount(): void;
    clone(): WorkerQueueConfig;
}
export { WorkerQueueConfig };
