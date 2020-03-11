import { EventItem } from '../event-manager';
declare class SlaveConfig {
    private _config;
    private _polling;
    private _hasMore;
    private _listener;
    get config(): {
        count: number;
    };
    set config(value: {
        count: number;
    });
    get polling(): boolean;
    set polling(value: boolean);
    get listener(): (item: EventItem) => Promise<void>;
    set listener(value: (item: EventItem) => Promise<void>);
    get hasMore(): boolean;
    set hasMore(value: boolean);
}
export { SlaveConfig };
//# sourceMappingURL=slave-config.d.ts.map