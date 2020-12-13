import moment from 'moment';
import xml2js from 'xml2js';
import { ClientConfiguration, KeyValue } from '../../../../typings';
import { generateAuthenticationHash } from '../auth/authentication';
import { SQNSError } from '../auth/s-q-n-s-error';
import { RequestClient } from '../request-client/request-client';

export class BaseClient extends RequestClient {
  protected readonly _config: ClientConfiguration;

  private _arrayFields = ['MessageAttributes', 'member'];

  private readonly _service: string;

  constructor(service: string, config: ClientConfiguration) {
    super();
    this._service = service;
    this._config = { ...config };
    if (this._config.endpoint) {
      Object.assign(this._config, { endpoint: `${this._config.endpoint as string}/${this._service}` });
    }
  }

  protected request(request: { uri: string, method: string, body: KeyValue, headers?: KeyValue }): Promise<any> {
    const headers = {
      'x-amz-date': moment().utc().format('YYYYMMDDTHHmmss'),
      host: request.uri.split('/')[2],
    };
    const authorization = generateAuthenticationHash({
      service: this._service,
      accessKeyId: this._config.accessKeyId,
      secretAccessKey: this._config.secretAccessKey,
      region: this._config.region,
      date: headers['x-amz-date'],
      originalUrl: request.uri.split(headers.host)[1],
      host: headers.host,
      method: request.method,
      body: request.body,
    });
    request.headers = { ...(request.headers || {}), ...headers, authorization };
    return this.requestPromise(request)
      .then((serverResponse: string) => new Promise((resolve: (result: KeyValue) => void, reject: (error: unknown) => void) => {
        xml2js.parseString(serverResponse, (parserError: Error, result: KeyValue) => {
          if (parserError) {
            const builder = new xml2js.Builder({ rootName: 'ErrorResponse' });
            const error = Error(parserError.message) as (Error & { error: string });
            error.error = builder.buildObject({ Error: { Code: parserError.name, Message: parserError.message } });
            reject(error);
            return;
          }
          resolve(this.transformResponse(result) as KeyValue);
        });
      }))
      .catch((error: any) => new Promise((resolve: (value: unknown) => void, reject: (error: unknown) => void) => {
        xml2js.parseString(error.error, (parserError: any, result: any) => {
          if (parserError) {
            reject(new SQNSError({ code: error.statusCode, message: error.error }));
            return;
          }
          const { Code: [code], Message: [message] } = result.ErrorResponse.Error[0];
          reject(new SQNSError({ code, message }));
        });
      }));
  }

  private transformResponse(input: unknown): unknown {
    if (typeof input !== 'object') {
      return input;
    }
    const output = {};
    Object.keys(input).forEach((key: string) => {
      if (input[key] instanceof Array) {
        const inputValue = input[key] as Array<unknown>;
        // tslint:disable-next-line:prefer-conditional-expression
        if (!this._arrayFields.includes(key) && inputValue.length === 1) {
          output[key] = inputValue[0] === '' ? [] : this.transformResponse(inputValue[0]);
        } else {
          output[key] = inputValue.map((each: unknown) => this.transformResponse(each));
        }
      } else {
        output[key] = this.transformResponse(input[key]);
      }
    });
    return output;
  }
}
