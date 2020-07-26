import { RequestItem } from '../request-response-types/request-item';
declare class ManagerConfig {
    private _sending;
    private _baseParams;
    private _listener;
    get sending(): boolean;
    set sending(value: boolean);
    get baseParams(): (() => {
        [key: string]: any;
    }) | {
        [key: string]: any;
    };
    set baseParams(value: (() => {
        [key: string]: any;
    }) | {
        [key: string]: any;
    });
    get listener(): (nextItemListParams: {
        [key: string]: any;
    }) => Promise<[{
        [key: string]: any;
    }, Array<RequestItem>]>;
    set listener(value: (nextItemListParams: {
        [key: string]: any;
    }) => Promise<[{
        [key: string]: any;
    }, Array<RequestItem>]>);
}
export { ManagerConfig };
