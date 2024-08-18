import { BaseClient, BaseClientRequest } from './client/base-client';
import {
  BatchResultErrorEntry,
  CreateQueueRequest,
  CreateQueueResult,
  CreateTopicInput,
  CreateTopicResponse,
  DeleteQueueRequest,
  DeleteTopicInput,
  FindMessageByDeduplicationId,
  FindMessageByDeduplicationIdResult,
  FindMessageById,
  FindMessageByIdResult,
  GetPublishInput,
  GetPublishResponse,
  GetQueueUrlRequest,
  GetQueueUrlResult,
  GetSubscriptionInput,
  GetSubscriptionResponse,
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
  MarkPublishedInput,
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
  SubscribeResponse,
  UnsubscribeInput,
  UpdateMessageByDeduplicationId,
  UpdateMessageByDeduplicationIdResult,
  UpdateMessageById,
  UpdateMessageByIdResult,
} from './types';

export class SQNSClient extends BaseClient {
  async createQueue(params: CreateQueueRequest): Promise<CreateQueueResult> {
    const request: BaseClientRequest = {
      uri: `${this._sqs.config.endpoint}/queues`,
      body: { ...params },
      method: 'POST',
    };
    const result = await this.requestJSON(request);
    return result.data as CreateQueueResult;
  }

  async listQueues(params: ListQueuesRequest = {}): Promise<ListQueuesResponse> {
    const request: BaseClientRequest = {
      uri: `${this._sqs.config.endpoint}/queues/list`,
      body: { ...params },
      method: 'POST',
    };
    const response = await this.requestJSON(request);
    return response.data as ListQueuesResponse;
  }

  async getQueueUrl(params: GetQueueUrlRequest): Promise<GetQueueUrlResult> {
    const request: BaseClientRequest = {
      uri: `${this._sqs.config.endpoint}/queues/getUrl`,
      body: { ...params },
      method: 'POST',
    };
    const response = await this.requestJSON(request);
    return response.data as GetQueueUrlResult;
  }

  async sendMessage(params: SendMessageRequest): Promise<SendMessageResult> {
    const request: BaseClientRequest = {
      uri: `${params.QueueUrl}/send-message`,
      body: { ...params },
      method: 'POST',
    };
    const result = await this.requestJSON(request);
    return result.data as SendMessageResult;
  }

  async findByMessageId(params: FindMessageById): Promise<FindMessageByIdResult> {
    const request: BaseClientRequest = {
      uri: `${params.QueueUrl}/id/${params.MessageId}`,
      body: { ...params },
      method: 'POST',
    };
    const result = await this.requestJSON(request);
    return result.data as FindMessageByIdResult;
  }

  async findByMessageDeduplicationId(params: FindMessageByDeduplicationId): Promise<FindMessageByDeduplicationIdResult> {
    const request: BaseClientRequest = {
      uri: `${params.QueueUrl}/duplication-id/${params.MessageDeduplicationId}`,
      body: { ...params },
      method: 'POST',
    };
    const result = await this.requestJSON(request);
    return result.data as FindMessageByDeduplicationIdResult;
  }

  async updateMessageById(params: UpdateMessageById): Promise<UpdateMessageByIdResult> {
    const request: BaseClientRequest = {
      uri: `${params.QueueUrl}/id/${params.MessageId}`,
      body: { ...params },
      method: 'PUT',
    };
    const result = await this.requestJSON(request);
    return result.data as UpdateMessageByIdResult;
  }

  async updateMessageByDeduplicationId(params: UpdateMessageByDeduplicationId): Promise<UpdateMessageByDeduplicationIdResult> {
    const request: BaseClientRequest = {
      uri: `${params.QueueUrl}/duplication-id/${params.MessageDeduplicationId}`,
      body: { ...params },
      method: 'PUT',
    };
    const result = await this.requestJSON(request);
    return result.data as UpdateMessageByDeduplicationIdResult;
  }

  async receiveMessage(params: ReceiveMessageRequest): Promise<ReceiveMessageResult> {
    const request: BaseClientRequest = {
      uri: `${this._sqs.config.endpoint}/receiveMessages`,
      body: { ...params },
      method: 'POST',
    };
    const result = await this.requestJSON(request);
    return result.data as ReceiveMessageResult;
  }

  async deleteQueue(params: DeleteQueueRequest): Promise<void> {
    const request: BaseClientRequest = {
      uri: params.QueueUrl,
      body: { ...params },
      method: 'DELETE',
    };
    await this.requestJSON(request);
  }

  async sendMessageBatch(params: SendMessageBatchRequest): Promise<SendMessageBatchResult> {
    const request: BaseClientRequest = {
      uri: `${params.QueueUrl}/send-message/batch`,
      body: { ...params },
      method: 'POST',
    };
    request.body.SendMessageBatchRequestEntry = request.body.Entries;
    delete request.body.Entries;
    const response = await this.requestJSON(request);
    const result: SendMessageBatchResult = { Successful: [], Failed: [] };
    response.data.forEach((each: { MD5OfMessageBody?: string; }) => {
      if (each.MD5OfMessageBody) {
        result.Successful.push(each as SendMessageResult & { Id: string });
      } else {
        result.Failed.push(each as BatchResultErrorEntry);
      }
    });
    return result;
  }

  async markEventSuccess(MessageId: string, QueueUrl: string, successMessage: string = ''): Promise<void> {
    const request: BaseClientRequest = {
      uri: `${QueueUrl}/event/${MessageId}/success`,
      body: { successMessage },
      method: 'PUT',
    };
    await this.requestJSON(request);
  }

  async markEventFailure(MessageId: string, QueueUrl: string, failureMessage: string = ''): Promise<void> {
    const request: BaseClientRequest = {
      uri: `${QueueUrl}/event/${MessageId}/failure`,
      body: { failureMessage },
      method: 'PUT',
    };
    await this.requestJSON(request);
  }

  async createTopic(params: CreateTopicInput): Promise<CreateTopicResponse> {
    const request: BaseClientRequest = {
      uri: `${this._sns.config.endpoint}/topics`,
      body: { ...params },
      method: 'POST',
    };
    const response = await this.requestJSON(request);
    return response.data as CreateTopicResponse;
  }

  async listTopics(params: ListTopicsInput): Promise<ListTopicsResponse> {
    const request: BaseClientRequest = {
      uri: `${this._sns.config.endpoint}/topics/list`,
      body: { ...params },
      method: 'POST',
    };
    const response = await this.requestJSON(request);
    return response.data as ListTopicsResponse;
  }

  async getTopicAttributes(params: GetTopicAttributesInput): Promise<GetTopicAttributesResponse> {
    const request: BaseClientRequest = {
      uri: `${this._sns.config.endpoint}/topic/attributes`,
      body: { ...params },
      method: 'POST',
    };
    const response = await this.requestJSON(request);
    return response.data as GetTopicAttributesResponse;
  }

  async setTopicAttributes(params: SetTopicAttributesInput): Promise<void> {
    const request: BaseClientRequest = {
      uri: `${this._sns.config.endpoint}/topic/attributes`,
      body: { ...params },
      method: 'PUT',
    };
    await this.requestJSON(request);
  }

  async deleteTopic(params: DeleteTopicInput): Promise<void> {
    const request: BaseClientRequest = {
      uri: `${this._sns.config.endpoint}/topic`,
      body: { ...params },
      method: 'DELETE',
    };
    await this.requestJSON(request);
  }

  async publish(params: PublishInput): Promise<PublishResponse> {
    const request: BaseClientRequest = {
      uri: `${this._sns.config.endpoint}/publish`,
      body: { ...params },
      method: 'POST',
    };
    console.log('>>>>>>>publishNewData', params);
    const response = await this.requestJSON(request);
    return response.data as PublishResponse;
  }

  async subscribe(params: SubscribeInput): Promise<SubscribeResponse> {
    const request: BaseClientRequest = {
      uri: `${this._sns.config.endpoint}/subscribe`,
      body: { ...params },
      method: 'POST'
    };
    const response = await this.requestJSON(request);
    return response.data as SubscribeResponse;
  }

  async listSubscriptions(params: ListSubscriptionsInput): Promise<ListSubscriptionsResponse> {
    const request: BaseClientRequest = {
      uri: `${this._sns.config.endpoint}/subscriptions/list`,
      body: { ...params },
      method: 'POST',
    };
    const response = await this.requestJSON(request);
    return response.data as ListSubscriptionsResponse;
  }

  async listSubscriptionsByTopic(params: ListSubscriptionsByTopicInput): Promise<ListSubscriptionsByTopicResponse> {
    const request: BaseClientRequest = {
      uri: `${this._sns.config.endpoint}/subscriptions/list/by-topic`,
      body: { ...params },
      method: 'POST',
    };
    const response = await this.requestJSON(request);
    return response.data as ListSubscriptionsByTopicResponse;
  }

  async unsubscribe(params: UnsubscribeInput): Promise<void> {
    const request: BaseClientRequest = {
      uri: `${this._sns.config.endpoint}/subscription`,
      body: { ...params },
      method: 'DELETE',
    };
    await this.requestJSON(request);
  }

  async getPublish(params: GetPublishInput): Promise<GetPublishResponse> {
    const request: BaseClientRequest = {
      uri: `${this._sns.config.endpoint}/publish/find`,
      body: { ...params },
      method: 'POST',
    };
    const response = await this.requestJSON(request);
    return response.data as GetPublishResponse;
  }

  async getSubscription(params: GetSubscriptionInput): Promise<GetSubscriptionResponse> {
    const request: BaseClientRequest = {
      uri: `${this._sns.config.endpoint}/subscription`,
      body: { ...params },
      method: 'POST',
    };
    const response = await this.requestJSON(request);
    return response.data as GetSubscriptionResponse;
  }

  async markPublished(params: MarkPublishedInput): Promise<void> {
    const request: BaseClientRequest = {
      uri: `${this._sns.config.endpoint}/published`,
      body: { Action: 'MarkPublished', ...params },
      method: 'POST',
    };
    await this.requestJSON(request);
  }
}
