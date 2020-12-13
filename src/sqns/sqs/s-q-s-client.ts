import AWS, { AWSError } from 'aws-sdk';
import SQS from 'aws-sdk/clients/sqs';
import {
  ClientConfiguration,
  CreateQueueRequest, CreateQueueResult,
  DeleteQueueRequest,
  GetQueueUrlRequest, GetQueueUrlResult,
  ListQueuesRequest, ListQueuesResponse,
  ReceiveMessageRequest, ReceiveMessageResult,
  SendMessageBatchRequest, SendMessageBatchResult, SendMessageRequest, SendMessageResult,
} from '../../../typings';
import { BaseClient } from '../common/client/base-client';

class SQSClient extends BaseClient {
  private sqs: AWS.SQS;

  constructor(options: ClientConfiguration) {
    super('sqs', options);
    this.sqs = new SQS(this._config);
  }

  listQueues(params: ListQueuesRequest = {}): Promise<ListQueuesResponse> {
    return new Promise((resolve: (listQueuesResult: ListQueuesResponse) => void, reject: (error: AWSError) => void) => {
      this.sqs.listQueues(params, (error: AWSError, queuesResult_: ListQueuesResponse) => {
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
    return new Promise((resolve: (createQueueResult: CreateQueueResult) => void, reject: (error: AWSError) => void) => {
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
    return new Promise((resolve: (getQueueUrlResult: GetQueueUrlResult) => void, reject: (error: AWSError) => void) => {
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
    return new Promise((resolve: (item: { [key: string]: any }) => void, reject: (error: AWSError) => void) => {
      this.sqs.deleteQueue(params, (error: AWSError, result: any) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  sendMessage(params: SendMessageRequest): Promise<SendMessageResult> {
    return new Promise((resolve: (sendMessageResult: SendMessageResult) => void, reject: (error: AWSError) => void) => {
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
    return new Promise((resolve: (receiveMessageResult: ReceiveMessageResult) => void, reject: (error: AWSError) => void) => {
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
    return new Promise((resolve: (sendMessageBatchResult: SendMessageBatchResult) => void, reject: (error: AWSError) => void) => {
      this.sqs.sendMessageBatch(params, (error: AWSError, result: SendMessageBatchResult) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async markEventSuccess(MessageId: string, QueueUrl: string, successMessage: string = ''): Promise<void> {
    const request = {
      method: 'POST',
      uri: `${QueueUrl}/event/${MessageId}/success`,
      body: { successMessage },
      json: true,
    };
    await this.request(request);
  }

  async markEventFailure(MessageId: string, QueueUrl: string, failureMessage: string = ''): Promise<void> {
    const request = {
      method: 'POST',
      uri: `${QueueUrl}/event/${MessageId}/failure`,
      body: { failureMessage },
      json: true,
    };
    await this.request(request);
  }
}

export { SQSClient };
