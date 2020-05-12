import { EventItem } from '../event-manager';
declare class ProcessingConfig {
    private _config;
    private _polling;
    private _hasMore;
    private _listener;
    get config(): {
        count: number;
    };
    get polling(): boolean;
    set polling(value: boolean);
    get listener(): (item: EventItem) => Promise<string>;
    set listener(value: (item: EventItem) => Promise<string>);
    get hasMore(): boolean;
    set hasMore(value: boolean);
}
export { ProcessingConfig };
