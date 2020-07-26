import { ResponseItem } from '../request-response-types/response-item';
declare class WorkerConfig {
    private _config;
    private _polling;
    private _hasMore;
    private _listener;
    get config(): {
        count: number;
    };
    get polling(): boolean;
    set polling(value: boolean);
    get listener(): (item: ResponseItem) => Promise<string>;
    set listener(value: (item: ResponseItem) => Promise<string>);
    get hasMore(): boolean;
    set hasMore(value: boolean);
}
export { WorkerConfig };
