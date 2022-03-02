import SNS from 'aws-sdk/clients/sns';
import SQS from 'aws-sdk/clients/sqs';
import moment from 'moment';
import xml2js from 'xml2js';
import { ClientConfiguration, KeyValue } from '../../../../typings/typings';
import { generateAuthenticationHash } from '../auth/authentication';
import { SQNSError } from '../auth/s-q-n-s-error';
import { RequestClient } from '../request-client/request-client';

export class BaseClient extends RequestClient {
  static readonly REGION: string = 'sqns';

  protected readonly _config: ClientConfiguration;

  protected readonly _sqs: SQS;

  protected readonly _sns: SNS;

  private _arrayFields = ['member'];

  constructor(service: string, config: ClientConfiguration) {
    super();
    this._config = { ...config, region: BaseClient.REGION };
    this._sqs = new SQS({ ...this._config, endpoint: `${config.endpoint}/sqs` });
    this._sns = new SNS({ ...this._config, endpoint: `${config.endpoint}/sns` });
  }

  request(request: { uri: string, body: KeyValue, headers?: KeyValue<string> }): Promise<any> {
    const headers = {
      'x-amz-date': moment().utc().format('YYYYMMDDTHHmmss'),
      host: request.uri.split('/')[2],
    };
    const authorization = generateAuthenticationHash({
      service: request.uri.split('/').pop(),
      accessKeyId: this._config.accessKeyId,
      secretAccessKey: this._config.secretAccessKey,
      region: this._config.region,
      date: headers['x-amz-date'],
      originalUrl: request.uri.split(headers.host)[1],
      host: headers.host,
      method: 'POST',
      body: request.body,
    });
    request.headers = { ...(request.headers || {}), ...headers, authorization };
    return this.post(request.uri, { body: JSON.stringify(request.body), headers: request.headers, jsonBody: true })
      .then((serverResponse: string) => new Promise((resolve: (result: KeyValue) => void, reject: (error: unknown) => void) => {
        xml2js.parseString(serverResponse, (parserError: Error, result: KeyValue) => {
          if (parserError) {
            const builder = new xml2js.Builder({ rootName: 'ErrorResponse' });
            const error = Error(parserError.message) as (Error & { error: string });
            error.error = builder.buildObject({ Error: { Code: parserError.name, Message: parserError.message } });
            reject(error);
            return;
          }
          resolve(this.transformServerResponse(result) as KeyValue);
        });
      }))
      .catch(({ error, message, code }) => new Promise((
        resolve: (value: unknown) => void,
        reject: (error: unknown) => void) => {
        xml2js.parseString(
          error || message,
          (parserError: unknown, result: { ErrorResponse: { Error: Array<{ Code: string; Message: string; }> } }) => {
            if (parserError) {
              reject(new SQNSError({ code, message }));
              return;
            }
            const { Code: [errorCode], Message: [errorMessage] } = result.ErrorResponse.Error[0];
            reject(new SQNSError({ code: errorCode, message: errorMessage }));
          });
      }));
  }

  private transformServerResponse(input: unknown): unknown {
    if (typeof input !== 'object') {
      return input;
    }
    const output = {};
    Object.keys(input).forEach((key: string) => {
      if (input[key] instanceof Array) {
        const inputValue = input[key] as Array<unknown>;
        // tslint:disable-next-line:prefer-conditional-expression
        if (!this._arrayFields.includes(key) && inputValue.length === 1) {
          output[key] = inputValue[0] as string === '' ? undefined : this.transformServerResponse(inputValue[0]);
        } else if (this._arrayFields.includes(key) && inputValue.length === 1 && inputValue[0] as string === '') {
          output[key] = [];
        } else {
          output[key] = inputValue.map((each: unknown) => this.transformServerResponse(each));
        }
      } else {
        output[key] = this.transformServerResponse(input[key]);
      }
    });
    return output;
  }
}
