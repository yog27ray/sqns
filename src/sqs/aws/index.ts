import AWS, { AWSError } from 'aws-sdk';
import SQS from 'aws-sdk/clients/sqs';
import moment from 'moment';
import rp from 'request-promise';
import { parseString } from 'xml2js';
import {
  ClientConfiguration,
  CreateQueueRequest, CreateQueueResult,
  DeleteQueueRequest,
  GetQueueUrlRequest, GetQueueUrlResult,
  ListQueuesRequest, ListQueuesResult,
  ReceiveMessageRequest, ReceiveMessageResult,
  SendMessageBatchRequest, SendMessageBatchResult, SendMessageRequest, SendMessageResult,
} from '../request-response-types';
import { generateAuthorizationHash } from './aws-authentication';
import { AwsError } from './aws-error';

class SimpleQueueServerClient {
  private sqs: AWS.SQS;

  constructor(options: ClientConfiguration = {}) {
    if (options.endpoint) {
      Object.assign(options, { endpoint: `${options.endpoint}/sqs` });
    }
    this.sqs = new SQS(options);
  }

  listQueues(params: ListQueuesRequest = {}): Promise<ListQueuesResult> {
    return new Promise((resolve: Function, reject: Function) => {
      this.sqs.listQueues(params, (error: AWSError, queuesResult_: ListQueuesResult) => {
        if (error) {
          reject(error);
          return;
        }
        const queuesResult = queuesResult_;
        queuesResult.QueueUrls = queuesResult.QueueUrls || [];
        resolve(queuesResult);
      });
    });
  }

  createQueue(params: CreateQueueRequest): Promise<CreateQueueResult> {
    return new Promise((resolve: Function, reject: Function) => {
      this.sqs.createQueue(params, (error: AWSError, result: CreateQueueResult) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  getQueueUrl(params: GetQueueUrlRequest): Promise<GetQueueUrlResult> {
    return new Promise((resolve: Function, reject: Function) => {
      this.sqs.getQueueUrl(params, (error: AWSError, result: GetQueueUrlResult) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  deleteQueue(params: DeleteQueueRequest): Promise<any> {
    return new Promise((resolve: Function, reject: Function) => {
      this.sqs.deleteQueue(params, (error: AWSError, result: any) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  sendMessage(params: SendMessageRequest): Promise<any> {
    return new Promise((resolve: Function, reject: Function) => {
      this.sqs.sendMessage(params, (error: AWSError, result: SendMessageResult) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  receiveMessage(params: ReceiveMessageRequest): Promise<ReceiveMessageResult> {
    return new Promise((resolve: Function, reject: Function) => {
      this.sqs.receiveMessage(params, (error: AWSError, result_: ReceiveMessageResult) => {
        if (error) {
          reject(error);
          return;
        }
        const result = result_;
        result.Messages = result.Messages || [];
        resolve(result);
      });
    });
  }

  sendMessageBatch(params: SendMessageBatchRequest): Promise<SendMessageBatchResult> {
    return new Promise((resolve: Function, reject: Function) => {
      this.sqs.sendMessageBatch(params, (error: AWSError, result: SendMessageBatchResult) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async markEventSuccess(MessageId: any, QueueUrl: string, successMessage: string = ''): Promise<void> {
    const request = {
      method: 'POST',
      uri: `${QueueUrl}/event/${MessageId}/success`,
      body: { successMessage },
      json: true,
    };
    await this.request(request);
  }

  async markEventFailure(MessageId: any, QueueUrl: string, failureMessage: string = ''): Promise<void> {
    const request = {
      method: 'POST',
      uri: `${QueueUrl}/event/${MessageId}/failure`,
      body: { failureMessage },
      json: true,
    };
    await this.request(request);
  }

  private async request(request: any): Promise<any> {
    const headers = {
      'x-amz-date': moment().utc().format('YYYYMMDDTHHmmss'),
      host: request.uri.split('/')[2],
    };
    const authorization = generateAuthorizationHash(
      this.sqs.config.accessKeyId,
      this.sqs.config.secretAccessKey,
      this.sqs.config.region,
      headers['x-amz-date'],
      headers.host,
      request.uri.split(headers.host)[1],
      request.method,
      request.body);
    request.headers = { ...(request.headers || {}), ...headers, authorization };
    await rp(request)
      .catch((error: any) => new Promise((resolve: Function, reject: any) => {
        parseString(error.error, (parserError: any, result: any) => {
          if (parserError) {
            reject(new AwsError({ code: error.statusCode, message: error.error }));
            return;
          }
          const { Code: [code], Message: [message] } = result.ErrorResponse.Error[0];
          reject(new AwsError({ code, message }));
        });
      }));
  }
}

export { SimpleQueueServerClient };
