import { BaseClient, BaseClientRequest } from './client/base-client';
import {
  BatchResultErrorEntry,
  ConfirmSubscriptionInput,
  ConfirmSubscriptionResponse,
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

  async sendMessage(params: SendMessageRequest): Promise<SendMessageResult> {
    const request: BaseClientRequest = {
      uri: `${this._sqs.config.endpoint}/messages`,
      body: { ...params },
      method: 'POST',
    };
    const result = await this.requestJSON(request);
    return result.data as SendMessageResult;
  }

  async findByMessageId(params: FindMessageById): Promise<FindMessageByIdResult> {
    const request: BaseClientRequest = {
      uri: `${this._sqs.config.endpoint}/messages/findById`,
      body: { ...params },
      method: 'POST',
    };
    const result = await this.requestJSON(request);
    return result.data as FindMessageByIdResult;
  }

  async findByMessageDeduplicationId(params: FindMessageByDeduplicationId): Promise<FindMessageByDeduplicationIdResult> {
    const request: BaseClientRequest = {
      uri: `${this._sqs.config.endpoint}/messages/findByDuplicationId`,
      body: { ...params },
      method: 'POST',
    };
    const result = await this.requestJSON(request);
    return result.data as FindMessageByDeduplicationIdResult;
  }

  async updateMessageById(params: UpdateMessageById): Promise<UpdateMessageByIdResult> {
    const request: BaseClientRequest = {
      uri: `${this._sqs.config.endpoint}/message/byId`,
      body: { ...params },
      method: 'PUT',
    };
    const result = await this.requestJSON(request);
    return result.data as UpdateMessageByIdResult;
  }

  async updateMessageByDeduplicationId(params: UpdateMessageByDeduplicationId): Promise<UpdateMessageByDeduplicationIdResult> {
    const request: BaseClientRequest = {
      uri: `${this._sqs.config.endpoint}/message/byDuplicationId`,
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

  async listQueues(params: ListQueuesRequest = {}): Promise<ListQueuesResponse> {
    const request: BaseClientRequest = {
      uri: `${this._sqs.config.endpoint}/queues/list`,
      body: { ...params },
      method: 'POST',
    };
    const response = await this.requestJSON(request);
    return response.data as ListQueuesResponse;
  }

  async deleteQueue(params: DeleteQueueRequest): Promise<void> {
    const request: BaseClientRequest = {
      uri: `${this._sqs.config.endpoint}/queues`,
      body: { ...params },
      method: 'DELETE',
    };
    await this.requestJSON(request);
  }

  async sendMessageBatch(params: SendMessageBatchRequest): Promise<SendMessageBatchResult> {
    const request: BaseClientRequest = {
      uri: `${this._sqs.config.endpoint}/messages/batch`,
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

  async getQueueUrl(params: GetQueueUrlRequest): Promise<GetQueueUrlResult> {
    const request: BaseClientRequest = {
      uri: `${this._sqs.config.endpoint}/queues/getUrl`,
      body: { ...params },
      method: 'POST',
    };
    const response = await this.requestJSON(request);
    return response.data as GetQueueUrlResult;
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
    const request: BaseClientRequest = {
      uri: this._sns.config.endpoint,
      body: { ...params, Action: 'CreateTopic' },
    };
    const response = await this.request(request);
    return response.CreateTopicResponse.CreateTopicResult as CreateTopicResponse;
  }

  async listTopics(params: ListTopicsInput): Promise<ListTopicsResponse> {
    const request: BaseClientRequest = {
      uri: this._sns.config.endpoint,
      body: { ...params, Action: 'ListTopics' },
    };
    const response = await this.request(request);
    if (!response.ListTopicsResponse.ListTopicsResult.Topics) {
      response.ListTopicsResponse.ListTopicsResult.Topics = { member: [] };
    }
    response.ListTopicsResponse.ListTopicsResult.Topics = response.ListTopicsResponse.ListTopicsResult.Topics.member;
    return response.ListTopicsResponse.ListTopicsResult as ListTopicsResponse;
  }

  async getTopicAttributes(params: GetTopicAttributesInput): Promise<GetTopicAttributesResponse> {
    const request: BaseClientRequest = {
      uri: this._sns.config.endpoint,
      body: { ...params, Action: 'GetTopicAttributes' },
    };
    const response = await this.request(request);
    response.GetTopicAttributesResponse.GetTopicAttributesResult.Attributes = response
      .GetTopicAttributesResponse.GetTopicAttributesResult.Attributes.entrys;
    return response.GetTopicAttributesResponse.GetTopicAttributesResult as GetTopicAttributesResponse;
  }

  async setTopicAttributes(params: SetTopicAttributesInput): Promise<void> {
    const request: BaseClientRequest = {
      uri: this._sns.config.endpoint,
      body: { ...params, Action: 'SetTopicAttributes' },
    };
    await this.request(request);
  }

  async deleteTopic(params: DeleteTopicInput): Promise<void> {
    const request: BaseClientRequest = {
      uri: this._sns.config.endpoint,
      body: { ...params, Action: 'DeleteTopic' },
    };
    await this.request(request);
  }

  async publish(params: PublishInput): Promise<PublishResponse> {
    const request: BaseClientRequest = {
      uri: this._sns.config.endpoint,
      body: { ...params, Action: 'Publish' },
    };
    const response = await this.request(request);
    return response.PublishResponse.PublishResult as PublishResponse;
  }

  async subscribe(params: SubscribeInput): Promise<SubscribeResponse> {
    const request: BaseClientRequest = {
      uri: this._sns.config.endpoint,
      body: { ...params, Action: 'Subscribe' },
    };
    const response = await this.request(request);
    return response.SubscribeResponse.SubscribeResult as SubscribeResponse;
  }

  async listSubscriptions(params: ListSubscriptionsInput): Promise<ListSubscriptionsResponse> {
    const request: BaseClientRequest = {
      uri: this._sns.config.endpoint,
      body: { ...params, Action: 'ListSubscriptions' },
    };
    const response = await this.request(request);
    if (!response.ListSubscriptionsResponse.ListSubscriptionsResult.Subscriptions) {
      response.ListSubscriptionsResponse.ListSubscriptionsResult.Subscriptions = { member: [] };
    }
    response.ListSubscriptionsResponse.ListSubscriptionsResult.Subscriptions = response
      .ListSubscriptionsResponse.ListSubscriptionsResult.Subscriptions.member;
    return response.ListSubscriptionsResponse.ListSubscriptionsResult as ListSubscriptionsResponse;
  }

  async listSubscriptionsByTopic(params: ListSubscriptionsByTopicInput): Promise<ListSubscriptionsByTopicResponse> {
    const request: BaseClientRequest = {
      uri: this._sns.config.endpoint,
      body: { ...params, Action: 'ListSubscriptionsByTopic' },
    };
    const response = await this.request(request);
    if (!response.ListSubscriptionsByTopicResponse.ListSubscriptionsByTopicResult.Subscriptions) {
      response.ListSubscriptionsByTopicResponse.ListSubscriptionsByTopicResult.Subscriptions = { member: [] };
    }
    response.ListSubscriptionsByTopicResponse.ListSubscriptionsByTopicResult.Subscriptions = response
      .ListSubscriptionsByTopicResponse.ListSubscriptionsByTopicResult.Subscriptions.member;
    return response.ListSubscriptionsByTopicResponse.ListSubscriptionsByTopicResult as ListSubscriptionsByTopicResponse;
  }

  async confirmSubscription(params: ConfirmSubscriptionInput): Promise<ConfirmSubscriptionResponse> {
    const request: BaseClientRequest = {
      uri: this._sns.config.endpoint,
      body: { ...params, Action: 'ConfirmSubscription' },
    };
    const response = await this.request(request);
    return response.ConfirmSubscriptionResponse.ConfirmSubscriptionResult as ConfirmSubscriptionResponse;
  }

  async unsubscribe(params: UnsubscribeInput): Promise<void> {
    const request: BaseClientRequest = {
      uri: this._sns.config.endpoint,
      body: { ...params, Action: 'Unsubscribe' },
    };
    await this.request(request);
  }

  async getPublish(params: GetPublishInput): Promise<GetPublishResponse> {
    const request = {
      uri: this._sns.config.endpoint,
      body: { Action: 'GetPublish', ...params },
    };
    const response = await this.request(request);
    if (response.GetPublishResponse.GetPublish.Message) {
      response.GetPublishResponse.GetPublish.Message = response.GetPublishResponse.GetPublish.Message[0];
    }
    return response?.GetPublishResponse?.GetPublish as GetPublishResponse;
  }

  async getSubscription(params: GetSubscriptionInput): Promise<GetSubscriptionResponse> {
    const request = {
      uri: this._sns.config.endpoint,
      body: { Action: 'GetSubscription', ...params },
    };
    const response = await this.request(request);
    return response?.GetSubscriptionResponse?.GetSubscriptionResult as GetSubscriptionResponse;
  }

  async markPublished(params: MarkPublishedInput): Promise<void> {
    const request = {
      uri: this._sns.config.endpoint,
      body: { Action: 'MarkPublished', ...params },
    };
    await this.request(request);
  }
}
