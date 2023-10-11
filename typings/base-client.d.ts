import { KeyValue } from './common';
export declare interface BaseClientRequest {
    uri: string;
    body: KeyValue;
    headers?: KeyValue<string>;
}
