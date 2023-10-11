"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQNSClient = void 0;
const base_client_1 = require("./common/client/base-client");
class SQNSClient extends base_client_1.BaseClient {
    async createQueue(params) {
        const request = {
            uri: this._sqs.config.endpoint,
            body: { ...params, Action: 'CreateQueue' },
        };
        const result = await this.request(request);
        return result.CreateQueueResponse.CreateQueueResult;
    }
    async sendMessage(params) {
        const request = {
            uri: this._sqs.config.endpoint,
            body: { ...params, Action: 'SendMessage' },
        };
        const result = await this.request(request);
        return result.SendMessageResponse.SendMessageResult;
    }
    async findByMessageId(params) {
        const request = {
            uri: this._sqs.config.endpoint,
            body: { Action: 'FindMessageById', ...params },
        };
        const result = await this.request(request);
        result.FindMessageByIdResponse.FindMessageByIdResult.Message = result.FindMessageByIdResponse.FindMessageByIdResult.Message[0];
        return result.FindMessageByIdResponse.FindMessageByIdResult;
    }
    async findByMessageDeduplicationId(params) {
        const request = {
            uri: this._sqs.config.endpoint,
            body: { Action: 'FindMessageByDeduplicationId', ...params },
        };
        const result = await this.request(request);
        result.FindMessageByDeduplicationIdResponse.FindMessageByDeduplicationIdResult.Message = result
            .FindMessageByDeduplicationIdResponse.FindMessageByDeduplicationIdResult.Message[0];
        return result.FindMessageByDeduplicationIdResponse.FindMessageByDeduplicationIdResult;
    }
    async updateMessageById(params) {
        const request = {
            uri: this._sqs.config.endpoint,
            body: { Action: 'UpdateMessageById', ...params },
        };
        const result = await this.request(request);
        result.UpdateMessageByIdResponse.UpdateMessageByIdResult.Message = result
            .UpdateMessageByIdResponse.UpdateMessageByIdResult.Message[0];
        return result.UpdateMessageByIdResponse.UpdateMessageByIdResult;
    }
    async updateMessageByDeduplicationId(params) {
        const request = {
            uri: this._sqs.config.endpoint,
            body: { Action: 'UpdateMessageByDeduplicationId', ...params },
        };
        const result = await this.request(request);
        result.UpdateMessageByDeduplicationIdResponse.UpdateMessageByDeduplicationIdResult.Message = result
            .UpdateMessageByDeduplicationIdResponse.UpdateMessageByDeduplicationIdResult.Message[0];
        return result.UpdateMessageByDeduplicationIdResponse.UpdateMessageByDeduplicationIdResult;
    }
    async receiveMessage(params) {
        const request = {
            uri: this._sqs.config.endpoint,
            body: { ...params, Action: 'ReceiveMessage' },
        };
        const result = await this.request(request);
        if (!result.ReceiveMessageResponse.ReceiveMessageResult) {
            result.ReceiveMessageResponse.ReceiveMessageResult = {};
        }
        result.ReceiveMessageResponse.ReceiveMessageResult.Messages = result.ReceiveMessageResponse.ReceiveMessageResult.Message;
        delete result.ReceiveMessageResponse.ReceiveMessageResult.Message;
        const response = result.ReceiveMessageResponse.ReceiveMessageResult;
        response.Messages = response.Messages || [];
        return response;
    }
    async listQueues(params = {}) {
        const request = {
            uri: this._sqs.config.endpoint,
            body: { ...params, Action: 'ListQueues' },
        };
        const response = await this.request(request);
        if (!response.ListQueuesResponse.ListQueuesResult) {
            response.ListQueuesResponse.ListQueuesResult = {};
        }
        response.ListQueuesResponse.ListQueuesResult.QueueUrls = response.ListQueuesResponse.ListQueuesResult.QueueUrl;
        delete response.ListQueuesResponse.ListQueuesResult.QueueUrl;
        const result = response.ListQueuesResponse.ListQueuesResult;
        result.QueueUrls = result.QueueUrls || [];
        return result;
    }
    async deleteQueue(params) {
        const request = {
            uri: this._sqs.config.endpoint,
            body: { ...params, Action: 'DeleteQueue' },
        };
        await this.request(request);
    }
    async sendMessageBatch(params) {
        const request = {
            uri: this._sqs.config.endpoint,
            body: { ...params, Action: 'SendMessageBatch' },
        };
        request.body.SendMessageBatchRequestEntry = request.body.Entries;
        delete request.body.Entries;
        const response = await this.request(request);
        const result = { Successful: [], Failed: [] };
        response.SendMessageBatchResponse.SendMessageBatchResult.SendMessageBatchResultEntry
            .forEach((each) => {
            if (each.MD5OfMessageBody) {
                result.Successful.push(each);
            }
            else {
                result.Failed.push(each);
            }
        });
        return result;
    }
    async getQueueUrl(params) {
        const request = {
            uri: this._sqs.config.endpoint,
            body: { ...params, Action: 'GetQueueUrl' },
        };
        const response = await this.request(request);
        return response.GetQueueURLResponse.GetQueueUrlResult;
    }
    async markEventSuccess(MessageId, QueueUrl, successMessage = '') {
        const request = {
            uri: `${QueueUrl}/event/${MessageId}/success`,
            body: { successMessage },
        };
        await this.request(request);
    }
    async markEventFailure(MessageId, QueueUrl, failureMessage = '') {
        const request = {
            uri: `${QueueUrl}/event/${MessageId}/failure`,
            body: { failureMessage },
        };
        await this.request(request);
    }
    async createTopic(params) {
        const request = {
            uri: this._sns.config.endpoint,
            body: { ...params, Action: 'CreateTopic' },
        };
        const response = await this.request(request);
        return response.CreateTopicResponse.CreateTopicResult;
    }
    async listTopics(params) {
        const request = {
            uri: this._sns.config.endpoint,
            body: { ...params, Action: 'ListTopics' },
        };
        const response = await this.request(request);
        if (!response.ListTopicsResponse.ListTopicsResult.Topics) {
            response.ListTopicsResponse.ListTopicsResult.Topics = { member: [] };
        }
        response.ListTopicsResponse.ListTopicsResult.Topics = response.ListTopicsResponse.ListTopicsResult.Topics.member;
        return response.ListTopicsResponse.ListTopicsResult;
    }
    async getTopicAttributes(params) {
        const request = {
            uri: this._sns.config.endpoint,
            body: { ...params, Action: 'GetTopicAttributes' },
        };
        const response = await this.request(request);
        response.GetTopicAttributesResponse.GetTopicAttributesResult.Attributes = response
            .GetTopicAttributesResponse.GetTopicAttributesResult.Attributes.entrys;
        return response.GetTopicAttributesResponse.GetTopicAttributesResult;
    }
    async setTopicAttributes(params) {
        const request = {
            uri: this._sns.config.endpoint,
            body: { ...params, Action: 'SetTopicAttributes' },
        };
        await this.request(request);
    }
    async deleteTopic(params) {
        const request = {
            uri: this._sns.config.endpoint,
            body: { ...params, Action: 'DeleteTopic' },
        };
        await this.request(request);
    }
    async publish(params) {
        const request = {
            uri: this._sns.config.endpoint,
            body: { ...params, Action: 'Publish' },
        };
        const response = await this.request(request);
        return response.PublishResponse.PublishResult;
    }
    async subscribe(params) {
        const request = {
            uri: this._sns.config.endpoint,
            body: { ...params, Action: 'Subscribe' },
        };
        const response = await this.request(request);
        return response.SubscribeResponse.SubscribeResult;
    }
    async listSubscriptions(params) {
        const request = {
            uri: this._sns.config.endpoint,
            body: { ...params, Action: 'ListSubscriptions' },
        };
        const response = await this.request(request);
        if (!response.ListSubscriptionsResponse.ListSubscriptionsResult.Subscriptions) {
            response.ListSubscriptionsResponse.ListSubscriptionsResult.Subscriptions = { member: [] };
        }
        response.ListSubscriptionsResponse.ListSubscriptionsResult.Subscriptions = response
            .ListSubscriptionsResponse.ListSubscriptionsResult.Subscriptions.member;
        return response.ListSubscriptionsResponse.ListSubscriptionsResult;
    }
    async listSubscriptionsByTopic(params) {
        const request = {
            uri: this._sns.config.endpoint,
            body: { ...params, Action: 'ListSubscriptionsByTopic' },
        };
        const response = await this.request(request);
        if (!response.ListSubscriptionsByTopicResponse.ListSubscriptionsByTopicResult.Subscriptions) {
            response.ListSubscriptionsByTopicResponse.ListSubscriptionsByTopicResult.Subscriptions = { member: [] };
        }
        response.ListSubscriptionsByTopicResponse.ListSubscriptionsByTopicResult.Subscriptions = response
            .ListSubscriptionsByTopicResponse.ListSubscriptionsByTopicResult.Subscriptions.member;
        return response.ListSubscriptionsByTopicResponse.ListSubscriptionsByTopicResult;
    }
    async confirmSubscription(params) {
        const request = {
            uri: this._sns.config.endpoint,
            body: { ...params, Action: 'ConfirmSubscription' },
        };
        const response = await this.request(request);
        return response.ConfirmSubscriptionResponse.ConfirmSubscriptionResult;
    }
    async unsubscribe(params) {
        const request = {
            uri: this._sns.config.endpoint,
            body: { ...params, Action: 'Unsubscribe' },
        };
        await this.request(request);
    }
    async getPublish(params) {
        var _a;
        const request = {
            uri: this._sns.config.endpoint,
            body: { Action: 'GetPublish', ...params },
        };
        const response = await this.request(request);
        if (response.GetPublishResponse.GetPublish.Message) {
            response.GetPublishResponse.GetPublish.Message = response.GetPublishResponse.GetPublish.Message[0];
        }
        return (_a = response === null || response === void 0 ? void 0 : response.GetPublishResponse) === null || _a === void 0 ? void 0 : _a.GetPublish;
    }
    async getSubscription(params) {
        var _a;
        const request = {
            uri: this._sns.config.endpoint,
            body: { Action: 'GetSubscription', ...params },
        };
        const response = await this.request(request);
        return (_a = response === null || response === void 0 ? void 0 : response.GetSubscriptionResponse) === null || _a === void 0 ? void 0 : _a.GetSubscriptionResult;
    }
    async markPublished(params) {
        const request = {
            uri: this._sns.config.endpoint,
            body: { Action: 'MarkPublished', ...params },
        };
        await this.request(request);
    }
}
exports.SQNSClient = SQNSClient;
//# sourceMappingURL=s-q-n-s-client.js.map