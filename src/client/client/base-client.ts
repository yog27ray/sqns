import moment from 'moment';
import { v4 as uuid } from 'uuid';
import xml2js from 'xml2js';
import { signRequest } from '../auth/authentication';
import { SQNSError } from '../auth/s-q-n-s-error';
import { updateLogging } from '../logger/logger';
import { RequestClient } from '../request-client/request-client';
import { ClientConfiguration, KeyValue } from '../types';
import { SNSService } from './s-n-s-service';
import { SQSService } from './s-q-s-service';

export declare interface BaseClientRequest {
  uri: string;
  body: KeyValue;
  headers?: KeyValue<string>;
  method?: 'POST' | 'GET';
  requestId?: string;
}

export class BaseClient extends RequestClient {
  static readonly REGION: string = 'sqns';

  protected readonly _config: ClientConfiguration;

  protected readonly _sqs: SQSService;

  protected readonly _sns: SNSService;

  private _arrayFields = ['member', 'Message', 'SendMessageBatchResultEntry'];

  private _arrayToJSONFields = ['Attribute', 'MessageAttribute', 'entry'];

  constructor(config: ClientConfiguration) {
    super();
    this._config = { ...config, region: BaseClient.REGION };
    this._sqs = new SQSService({ ...this._config, endpoint: `${config.endpoint}/sqs` });
    this._sns = new SNSService({ ...this._config, endpoint: `${config.endpoint}/sns` });
    updateLogging(config.logging);
  }

  processNormalizeJSONBodyOfKey(key: string, value: unknown, snsRequest: boolean): unknown {
    const result = {};
    if (value === undefined) {
      return result;
    }
    if (value instanceof Array) {
      value.forEach((each, index) => {
        if (['SendMessageBatchRequestEntry', 'Tags'].includes(key)) {
          const subJson = this.normalizeNestedJSONBody(each, snsRequest);
          Object.keys(subJson).forEach((subKey: string) => {
            if (snsRequest) {
              result[`${key}.member.${index + 1}.${subKey}`] = subJson[subKey];
            } else {
              result[`${key}.${index + 1}.${subKey}`] = subJson[subKey];
            }
          });
        } else {
          result[`${key}.${index + 1}`] = each;
        }
      });
    } else if (typeof value === 'object') {
      const subObject = value as KeyValue;
      Object.keys(subObject).sort().forEach((k, index) => {
        if (typeof subObject[k] === 'object') {
          if (snsRequest) {
            result[`${key}.entry.${index + 1}.Name`] = k;
            Object.keys(subObject[k]).sort().forEach((x: string) => {
              result[`${key}.entry.${index + 1}.Value.${x}`] = subObject[k][x];
            });
          } else {
            result[`${key}.${index + 1}.Name`] = k;
            Object.keys(subObject[k]).sort().forEach((x: string) => {
              result[`${key}.${index + 1}.Value.${x}`] = subObject[k][x];
            });
          }
          return;
        }
        if (snsRequest) {
          result[`${key}.entry.${index + 1}.key`] = k;
          result[`${key}.entry.${index + 1}.value`] = subObject[k];
        } else {
          result[`${key}.${index + 1}.Name`] = k;
          result[`${key}.${index + 1}.Value`] = subObject[k];
        }
      });
    } else {
      result[key] = value;
    }
    return result;
  }

  normalizeNestedJSONBody(body: unknown, snsRequest: boolean): KeyValue {
    const result = {};
    Object.keys(body).sort().forEach((key: string) => {
      Object.assign(result, this.processNormalizeJSONBodyOfKey(key, body[key], snsRequest));
    });
    return result;
  }

  updateRequestBody(body_: KeyValue, snsRequest: boolean): void {
    const body = body_;
    if (typeof body !== 'object') {
      return;
    }
    if (body instanceof Array) {
      body.forEach((each: KeyValue) => this.updateRequestBody(each, snsRequest));
      return;
    }
    Object.keys(body).forEach((key: string) => {
      if ([
        'Attributes',
        'MessageAttributes',
        'MessageSystemAttributes',
        'AttributeNames',
        'MessageAttributeNames',
      ].includes(key) && !snsRequest) {
        body[key.substring(0, key.length - 1)] = body[key];
        delete body[key];
      }
      if (typeof body[key] !== 'object') {
        return;
      }
      this.updateRequestBody(body[key] as KeyValue, snsRequest);
    });
  }

  requestJSON(request: BaseClientRequest): Promise<any> {
    const headers = {
      'x-sqns-date': moment().utc().format('YYYYMMDDTHHmmss'),
      host: request.uri.split('/')[2],
    };
    request.body.requestId = uuid();
    // const isSNSRequest = request.uri.startsWith(`${this._config.endpoint}/sns`);
    // this.updateRequestBody(request.body, isSNSRequest);
    signRequest({
      service: request.uri.split('/').pop(),
      region: this._config.region,
      originalUrl: request.uri.split(headers.host)[1],
      headers,
      method: request.method,
      body: request.body,
    }, {
      accessKeyId: this._config.accessKeyId,
      secretAccessKey: this._config.secretAccessKey,
    }, ['host', 'x-sqns-content-sha256', 'x-sqns-date']);
    request.headers = { ...(request.headers || {}), ...headers };
    return this.post(request.uri, { json: true, body: JSON.stringify(request.body), headers: request.headers, jsonBody: true })
      .catch((originalError: SQNSError) => {
        const { message, code } = originalError;
        try {
          return Promise.reject(new SQNSError(JSON.parse(message)));
        } catch (error) {
          return Promise.reject(new SQNSError({ code, message }));
        }
        // const { error, message, code } = originalError;
        // return Promise.reject(new SQNSError({ code, message }));
        // return new Promise((
        //   resolve: (value: unknown) => void,
        //   reject: (error: unknown) => void) => {
        //   xml2js.parseString(
        //     error || message,
        //     (parserError: unknown, result: { ErrorResponse: { Error: Array<{ Code: string; Message: string; }> } }) => {
        //       if (parserError) {
        //         reject(new SQNSError({ code, message }));
        //         return;
        //       }
        //       const { Code: [errorCode], Message: [errorMessage] } = result.ErrorResponse.Error[0];
        //       reject(new SQNSError({ code: errorCode, message: errorMessage }));
        //     });
        // });
      });
  }

  request(request: BaseClientRequest): Promise<any> {
    const headers = {
      'x-sqns-date': moment().utc().format('YYYYMMDDTHHmmss'),
      host: request.uri.split('/')[2],
    };
    const isSNSRequest = request.uri.startsWith(`${this._config.endpoint}/sns`);
    this.updateRequestBody(request.body, isSNSRequest);
    request.body = this.normalizeNestedJSONBody(request.body, isSNSRequest);
    signRequest({
      service: request.uri.split('/').pop(),
      region: this._config.region,
      originalUrl: request.uri.split(headers.host)[1],
      headers,
      method: 'POST',
      body: request.body,
    }, {
      accessKeyId: this._config.accessKeyId,
      secretAccessKey: this._config.secretAccessKey,
    }, ['host', 'x-sqns-content-sha256', 'x-sqns-date']);
    request.headers = { ...(request.headers || {}), ...headers };
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
      // tslint:disable-next-line:arrow-parens
      .catch((originalError) => {
        const { error, message, code } = originalError;
        return new Promise((
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
        });
      });
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
        if (this._arrayToJSONFields.includes(key)) {
          output[`${key}s`] = inputValue.reduce((
            result_,
            item: { Name: [string]; Value: [unknown]; key: [string]; value: [unknown] }) => {
            const result = result_;
            if (item.Name) {
              result[item.Name[0]] = this.transformServerResponse(item.Value[0]);
            } else {
              result[item.key[0]] = this.transformServerResponse(item.value[0]);
            }
            return result;
          }, {});
          return;
        }
        if (!this._arrayFields.includes(key) && inputValue.length === 1) {
          output[key] = inputValue[0] as string === ''
            ? undefined
            : this.transformServerResponse(inputValue[0]);
          return;
        }
        if (this._arrayFields.includes(key) && inputValue.length === 1 && inputValue[0] as string === '') {
          output[key] = [];
          return;
        }
        output[key] = inputValue.map((each: unknown) => this.transformServerResponse(each));
      } else {
        output[key] = this.transformServerResponse(input[key]);
      }
    });
    return output;
  }
}
