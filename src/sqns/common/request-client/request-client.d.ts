import { BodyInit, HeaderInit } from 'node-fetch';
declare class RequestClient {
    post(url: string, { body, headers: headers_, json, jsonBody }?: {
        body?: BodyInit;
        headers?: HeaderInit;
        json?: boolean;
        jsonBody?: boolean;
    }): Promise<unknown>;
    get(url: string, json?: boolean): Promise<unknown>;
    private transformResponse;
}
export { RequestClient };
