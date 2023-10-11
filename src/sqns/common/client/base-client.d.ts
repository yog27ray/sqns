import { BaseClientRequest } from '../../../../typings/base-client';
import { ClientConfiguration, KeyValue } from '../../../../typings/typings';
import { RequestClient } from '../request-client/request-client';
import { SNSService } from './s-n-s-service';
import { SQSService } from './s-q-s-service';
export declare class BaseClient extends RequestClient {
    static readonly REGION: string;
    protected readonly _config: ClientConfiguration;
    protected readonly _sqs: SQSService;
    protected readonly _sns: SNSService;
    private _arrayFields;
    private _arrayToJSONFields;
    constructor(config: ClientConfiguration);
    processNormalizeJSONBodyOfKey(key: string, value: unknown, snsRequest: boolean): unknown;
    normalizeNestedJSONBody(body: unknown, snsRequest: boolean): KeyValue;
    updateRequestBody(body_: KeyValue, snsRequest: boolean): void;
    request(request: BaseClientRequest): Promise<any>;
    private transformServerResponse;
}
