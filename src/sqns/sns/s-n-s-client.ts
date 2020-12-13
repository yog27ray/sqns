import AWS, { AWSError } from 'aws-sdk';
import SNS from 'aws-sdk/clients/sns';
import {
  ClientConfiguration,
  ConfirmSubscriptionInput,
  ConfirmSubscriptionResponse, CreateTopicInput,
  CreateTopicResponse, DeleteTopicInput,
  GetTopicAttributesInput, GetTopicAttributesResponse,
  ListSubscriptionsByTopicInput,
  ListSubscriptionsByTopicResponse,
  ListSubscriptionsInput, ListSubscriptionsResponse,
  ListTopicsInput, ListTopicsResponse,
  PublishInput, PublishResponse,
  SetTopicAttributesInput, SubscribeInput,
  UnsubscribeInput,
} from '../../../typings';
import { GetPublishInput, GetPublishResponse, MarkPublishedInput } from '../../../typings/publish';
import { GetSubscriptionInput, GetSubscriptionResponse } from '../../../typings/subscription';
import { BaseClient } from '../common/client/base-client';

class SNSClient extends BaseClient {
  private sns: AWS.SNS;

  constructor(options: ClientConfiguration) {
    super('sns', options);
    this.sns = new SNS(this._config);
  }

  async createTopic(params: CreateTopicInput): Promise<CreateTopicResponse> {
    return new Promise((resolve: (createTopicResponse: CreateTopicResponse) => void, reject: (error: AWSError) => void) => {
      this.sns.createTopic(params, (error: AWSError, result: CreateTopicResponse) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async listTopics(params: ListTopicsInput): Promise<ListTopicsResponse> {
    return new Promise((resolve: (createTopicResponse: ListTopicsResponse) => void, reject: (error: AWSError) => void) => {
      this.sns.listTopics(params, (error: AWSError, result: ListTopicsResponse) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async getTopicAttributes(params: GetTopicAttributesInput): Promise<GetTopicAttributesResponse> {
    return new Promise((resolve: (createTopicResponse: GetTopicAttributesResponse) => void, reject: (error: AWSError) => void) => {
      this.sns.getTopicAttributes(params, (error: AWSError, result: GetTopicAttributesResponse) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async setTopicAttributes(params: SetTopicAttributesInput): Promise<Record<string, never>> {
    return new Promise((resolve: (createTopicResponse: Record<string, never>) => void, reject: (error: AWSError) => void) => {
      this.sns.setTopicAttributes(params, (error: AWSError, result: Record<string, never>) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async deleteTopic(params: DeleteTopicInput): Promise<Record<string, never>> {
    return new Promise((resolve: (createTopicResponse: Record<string, never>) => void, reject: (error: AWSError) => void) => {
      this.sns.deleteTopic(params, (error: AWSError, result: Record<string, never>) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async publish(params: PublishInput): Promise<PublishResponse> {
    return new Promise((resolve: (createTopicResponse: PublishResponse) => void, reject: (error: AWSError) => void) => {
      this.sns.publish(params, (error: AWSError, result: PublishResponse) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async subscribe(params: SubscribeInput): Promise<SNS.Types.SubscribeResponse> {
    return new Promise((resolve: (createTopicResponse: SNS.Types.SubscribeResponse) => void, reject: (error: AWSError) => void) => {
      this.sns.subscribe(params, (error: AWSError, result: SNS.Types.SubscribeResponse) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async listSubscriptions(params: ListSubscriptionsInput): Promise<ListSubscriptionsResponse> {
    return new Promise((resolve: (createTopicResponse: ListSubscriptionsResponse) => void, reject: (error: AWSError) => void) => {
      this.sns.listSubscriptions(params, (error: AWSError, result: ListSubscriptionsResponse) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async listSubscriptionsByTopic(params: ListSubscriptionsByTopicInput): Promise<ListSubscriptionsByTopicResponse> {
    return new Promise((resolve: (createTopicResponse: ListSubscriptionsByTopicResponse) => void, reject: (error: AWSError) => void) => {
      this.sns.listSubscriptionsByTopic(params, (error: AWSError, result: ListSubscriptionsByTopicResponse) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async confirmSubscription(params: ConfirmSubscriptionInput): Promise<ConfirmSubscriptionResponse> {
    return new Promise((resolve: (confirmSubscriptionResponse: ConfirmSubscriptionResponse) => void, reject: (error: AWSError) => void) => {
      this.sns.confirmSubscription(params, (error: AWSError, result: ConfirmSubscriptionResponse) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async unsubscribe(params: UnsubscribeInput): Promise<Record<string, never>> {
    return new Promise((resolve: (unsubscribeResponse: Record<string, never>) => void, reject: (error: AWSError) => void) => {
      this.sns.unsubscribe(params, (error: AWSError, result: Record<string, never>) => {
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
      method: 'POST',
      uri: this.sns.endpoint.href,
      body: { Action: 'GetPublish', ...params },
      json: true,
    };
    const response = await this.request(request);
    return response?.GetPublishResponse?.GetPublish as GetPublishResponse;
  }

  async getSubscription(params: GetSubscriptionInput): Promise<GetSubscriptionResponse> {
    const request = {
      method: 'POST',
      uri: this.sns.endpoint.href,
      body: { Action: 'GetSubscription', ...params },
      json: true,
    };
    const response = await this.request(request);
    return response?.GetSubscriptionResponse?.GetSubscriptionResult as GetSubscriptionResponse;
  }

  async markPublished(params: MarkPublishedInput): Promise<void> {
    const request = {
      method: 'POST',
      uri: this.sns.endpoint.href,
      body: { Action: 'MarkPublished', ...params },
      json: true,
    };
    await this.request(request);
  }
}

export { SNSClient };
