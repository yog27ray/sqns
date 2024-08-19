import moment from 'moment';
import { v4 as uuid } from 'uuid';
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
  method?: 'POST' | 'PUT' | 'DELETE';
  requestId?: string;
  service?: 'sqs' | 'sns';
}

export class BaseClient extends RequestClient {
  static readonly REGION: string = 'sqns';

  protected readonly _config: ClientConfiguration;

  protected readonly _sqs: SQSService;

  protected readonly _sns: SNSService;

  constructor(config: ClientConfiguration) {
    super();
    this._config = { ...config, region: BaseClient.REGION };
    this._sqs = new SQSService({ ...this._config, endpoint: `${config.endpoint}/v1/sqs` });
    this._sns = new SNSService({ ...this._config, endpoint: `${config.endpoint}/v1/sns` });
    updateLogging(config.logging);
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

  async request(request: BaseClientRequest): Promise<any> {
    const headers = {
      'x-sqns-date': moment()
        .utc()
        .format('YYYYMMDDTHHmmss'),
      host: request.uri.split('/')[2],
    };
    request.body.requestId = uuid();
    signRequest({
      service: request.uri.split('/')
        .pop(),
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
    try {
      return await this.http(
        request.uri,
        {
          json: true,
          body: JSON.stringify(request.body),
          headers: request.headers,
          jsonBody: true
        },
        request.method);
    } catch (originalError) {
      const { message, code } = originalError as SQNSError;
      try {
        return Promise.reject(new SQNSError(JSON.parse(message) as { code: string; message: string; }));
      } catch (error) {
        return Promise.reject(new SQNSError({ code, message }));
      }
    }
  }
}
