import { EventItem } from '../event-manager';
declare class CollectorConfig {
    private _sending;
    private _baseParams;
    private _listener;
    get sending(): boolean;
    set sending(value: boolean);
    get baseParams(): any;
    set baseParams(value: any);
    get listener(): (nextItemListParams: object) => Promise<[object, Array<EventItem>]>;
    set listener(value: (nextItemListParams: object) => Promise<[object, Array<EventItem>]>);
}
export { CollectorConfig };
