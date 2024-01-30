import { BodyInit, HeaderInit } from 'node-fetch';
declare class RequestClient {
    private static MAX_RE_ATTEMPT;
    static setMaxRetryAttempt(attempt: number): void;
    post(url: string, { body, headers: headers_, json, jsonBody }?: {
        body?: BodyInit;
        headers?: HeaderInit;
        json?: boolean;
        jsonBody?: boolean;
    }): Promise<unknown>;
    get(url: string, json?: boolean): Promise<unknown>;
    private transformResponse;
    private exponentialRetryServerErrorRequest;
    private retryWithAttempt;
}
export { RequestClient };
