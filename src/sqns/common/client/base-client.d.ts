import SNS from 'aws-sdk/clients/sns';
import SQS from 'aws-sdk/clients/sqs';
import { ClientConfiguration, KeyValue } from '../../../../typings';
import { RequestClient } from '../request-client/request-client';
export declare class BaseClient extends RequestClient {
    static readonly REGION: string;
    protected readonly _config: ClientConfiguration;
    protected readonly _sqs: SQS;
    protected readonly _sns: SNS;
    private _arrayFields;
    constructor(service: string, config: ClientConfiguration);
    protected request(request: {
        uri: string;
        body: KeyValue;
        headers?: KeyValue<string>;
    }): Promise<any>;
    private transformServerResponse;
}
