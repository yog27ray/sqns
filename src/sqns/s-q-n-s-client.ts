import { SQNSClientConfig } from '../../typings/client-confriguation';
import { FindMessageById, GetPublishInput, GetPublishResponse, MarkPublishedInput, UpdateMessageById } from '../../typings/publish';
import { FindMessageByIdResult, UpdateMessageByIdResult } from '../../typings/recieve-message';
import { GetSubscriptionInput, GetSubscriptionResponse, SubscribeResponse } from '../../typings/subscription';
import {
  ConfirmSubscriptionInput,
  ConfirmSubscriptionResponse,
  CreateQueueRequest,
  CreateQueueResult,
  CreateTopicInput,
  CreateTopicResponse,
  DeleteQueueRequest,
  DeleteTopicInput,
  GetQueueUrlRequest,
  GetQueueUrlResult,
  GetTopicAttributesInput,
  GetTopicAttributesResponse,
  ListQueuesRequest,
  ListQueuesResponse,
  ListSubscriptionsByTopicInput,
  ListSubscriptionsByTopicResponse,
  ListSubscriptionsInput,
  ListSubscriptionsResponse,
  ListTopicsInput,
  ListTopicsResponse,
  PublishInput,
  PublishResponse,
  ReceiveMessageRequest,
  ReceiveMessageResult,
  SendMessageBatchRequest,
  SendMessageBatchResult,
  SendMessageRequest,
  SendMessageResult,
  SetTopicAttributesInput,
  SubscribeInput,
  UnsubscribeInput,
} from '../../typings/typings';
import { SQNSError } from './common/auth/s-q-n-s-error';
import { BaseClient } from './common/client/base-client';

export class SQNSClient extends BaseClient {
  constructor(options: SQNSClientConfig) {
    super('', options);
  }

  createQueue(params: CreateQueueRequest): Promise<CreateQueueResult> {
    return new Promise((resolve: (createQueueResult: CreateQueueResult) => void, reject: (error: SQNSError) => void) => {
      this._sqs.createQueue(params, (error: SQNSError, result: CreateQueueResult) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  sendMessage(params: SendMessageRequest): Promise<SendMessageResult> {
    return new Promise((resolve: (sendMessageResult: SendMessageResult) => void, reject: (error: SQNSError) => void) => {
      this._sqs.sendMessage(params, (error: SQNSError, result: SendMessageResult) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async findByMessageId(params: FindMessageById): Promise<FindMessageByIdResult> {
    const request = {
      uri: this._sqs.endpoint.href,
      body: { Action: 'FindMessageById', ...params },
    };
    const { FindMessageByIdResponse: { FindMessageByIdResult } } = await this.request(request) as {
      FindMessageByIdResponse: { FindMessageByIdResult: FindMessageByIdResult },
    };
    return FindMessageByIdResult;
  }

  async updateMessageById(params: UpdateMessageById): Promise<UpdateMessageByIdResult> {
    const request = {
      uri: this._sqs.endpoint.href,
      body: { Action: 'UpdateMessageById', ...params },
    };
    const { FindMessageByIdResponse: { FindMessageByIdResult } } = await this.request(request) as {
      FindMessageByIdResponse: { FindMessageByIdResult: UpdateMessageByIdResult },
    };
    return FindMessageByIdResult;
  }

  receiveMessage(params: ReceiveMessageRequest): Promise<ReceiveMessageResult> {
    return new Promise((resolve: (receiveMessageResult: ReceiveMessageResult) => void, reject: (error: SQNSError) => void) => {
      this._sqs.receiveMessage(params, (error: SQNSError, result_: ReceiveMessageResult) => {
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

  listQueues(params: ListQueuesRequest = {}): Promise<ListQueuesResponse> {
    return new Promise((resolve: (listQueuesResult: ListQueuesResponse) => void, reject: (error: SQNSError) => void) => {
      this._sqs.listQueues(params, (error: SQNSError, queuesResult_: ListQueuesResponse) => {
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

  deleteQueue(params: DeleteQueueRequest): Promise<any> {
    return new Promise((resolve: (item: { [key: string]: any }) => void, reject: (error: SQNSError) => void) => {
      this._sqs.deleteQueue(params, (error: SQNSError, result: any) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  sendMessageBatch(params: SendMessageBatchRequest): Promise<SendMessageBatchResult> {
    return new Promise((resolve: (sendMessageBatchResult: SendMessageBatchResult) => void, reject: (error: SQNSError) => void) => {
      this._sqs.sendMessageBatch(params, (error: SQNSError, result: SendMessageBatchResult) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  getQueueUrl(params: GetQueueUrlRequest): Promise<GetQueueUrlResult> {
    return new Promise((resolve: (getQueueUrlResult: GetQueueUrlResult) => void, reject: (error: SQNSError) => void) => {
      this._sqs.getQueueUrl(params, (error: SQNSError, result: GetQueueUrlResult) => {
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
      uri: `${QueueUrl}/event/${MessageId}/success`,
      body: { successMessage },
    };
    await this.request(request);
  }

  async markEventFailure(MessageId: string, QueueUrl: string, failureMessage: string = ''): Promise<void> {
    const request = {
      uri: `${QueueUrl}/event/${MessageId}/failure`,
      body: { failureMessage },
    };
    await this.request(request);
  }

  async createTopic(params: CreateTopicInput): Promise<CreateTopicResponse> {
    return new Promise((resolve: (createTopicResponse: CreateTopicResponse) => void, reject: (error: SQNSError) => void) => {
      this._sns.createTopic(params, (error: SQNSError, result: CreateTopicResponse) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async listTopics(params: ListTopicsInput): Promise<ListTopicsResponse> {
    return new Promise((resolve: (createTopicResponse: ListTopicsResponse) => void, reject: (error: SQNSError) => void) => {
      this._sns.listTopics(params, (error: SQNSError, result: ListTopicsResponse) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async getTopicAttributes(params: GetTopicAttributesInput): Promise<GetTopicAttributesResponse> {
    return new Promise((resolve: (createTopicResponse: GetTopicAttributesResponse) => void, reject: (error: SQNSError) => void) => {
      this._sns.getTopicAttributes(params, (error: SQNSError, result: GetTopicAttributesResponse) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async setTopicAttributes(params: SetTopicAttributesInput): Promise<Record<string, never>> {
    return new Promise((resolve: (createTopicResponse: Record<string, never>) => void, reject: (error: SQNSError) => void) => {
      this._sns.setTopicAttributes(params, (error: SQNSError, result: Record<string, never>) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async deleteTopic(params: DeleteTopicInput): Promise<Record<string, never>> {
    return new Promise((resolve: (createTopicResponse: Record<string, never>) => void, reject: (error: SQNSError) => void) => {
      this._sns.deleteTopic(params, (error: SQNSError, result: Record<string, never>) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async publish(params: PublishInput): Promise<PublishResponse> {
    return new Promise((resolve: (createTopicResponse: PublishResponse) => void, reject: (error: SQNSError) => void) => {
      this._sns.publish(params, (error: SQNSError, result: PublishResponse) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async subscribe(params: SubscribeInput): Promise<SubscribeResponse> {
    return new Promise((resolve: (createTopicResponse: SubscribeResponse) => void, reject: (error: SQNSError) => void) => {
      this._sns.subscribe(params, (error: SQNSError, result: SubscribeResponse) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async listSubscriptions(params: ListSubscriptionsInput): Promise<ListSubscriptionsResponse> {
    return new Promise((resolve: (createTopicResponse: ListSubscriptionsResponse) => void, reject: (error: SQNSError) => void) => {
      this._sns.listSubscriptions(params, (error: SQNSError, result: ListSubscriptionsResponse) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async listSubscriptionsByTopic(params: ListSubscriptionsByTopicInput): Promise<ListSubscriptionsByTopicResponse> {
    return new Promise((resolve: (createTopicResponse: ListSubscriptionsByTopicResponse) => void, reject: (error: SQNSError) => void) => {
      this._sns.listSubscriptionsByTopic(params, (error: SQNSError, result: ListSubscriptionsByTopicResponse) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async confirmSubscription(params: ConfirmSubscriptionInput): Promise<ConfirmSubscriptionResponse> {
    return new Promise((
      resolve: (confirmSubscriptionResponse: ConfirmSubscriptionResponse) => void,
      reject: (error: SQNSError) => void) => {
      this._sns.confirmSubscription(params, (error: SQNSError, result: ConfirmSubscriptionResponse) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async unsubscribe(params: UnsubscribeInput): Promise<Record<string, never>> {
    return new Promise((resolve: (unsubscribeResponse: Record<string, never>) => void, reject: (error: SQNSError) => void) => {
      this._sns.unsubscribe(params, (error: SQNSError, result: Record<string, never>) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async getPublish(params: GetPublishInput): Promise<GetPublishResponse> {
    const request = {
      uri: this._sns.endpoint.href,
      body: { Action: 'GetPublish', ...params },
    };
    const response = await this.request(request);
    return response?.GetPublishResponse?.GetPublish as GetPublishResponse;
  }

  async getSubscription(params: GetSubscriptionInput): Promise<GetSubscriptionResponse> {
    const request = {
      uri: this._sns.endpoint.href,
      body: { Action: 'GetSubscription', ...params },
    };
    const response = await this.request(request);
    return response?.GetSubscriptionResponse?.GetSubscriptionResult as GetSubscriptionResponse;
  }

  async markPublished(params: MarkPublishedInput): Promise<void> {
    const request = {
      uri: this._sns.endpoint.href,
      body: { Action: 'MarkPublished', ...params },
    };
    await this.request(request);
  }
}
