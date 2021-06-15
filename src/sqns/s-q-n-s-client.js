"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQNSClient = void 0;
const base_client_1 = require("./common/client/base-client");
class SQNSClient extends base_client_1.BaseClient {
    constructor(options) {
        super('', options);
    }
    createQueue(params) {
        return new Promise((resolve, reject) => {
            this._sqs.createQueue(params, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
    }
    sendMessage(params) {
        return new Promise((resolve, reject) => {
            this._sqs.sendMessage(params, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
    }
    async findByMessageId(params) {
        const request = {
            uri: this._sqs.endpoint.href,
            body: { Action: 'FindMessageById', ...params },
        };
        const { FindMessageByIdResponse: { FindMessageByIdResult } } = await this.request(request);
        return FindMessageByIdResult;
    }
    receiveMessage(params) {
        return new Promise((resolve, reject) => {
            this._sqs.receiveMessage(params, (error, result_) => {
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
    listQueues(params = {}) {
        return new Promise((resolve, reject) => {
            this._sqs.listQueues(params, (error, queuesResult_) => {
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
    deleteQueue(params) {
        return new Promise((resolve, reject) => {
            this._sqs.deleteQueue(params, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
    }
    sendMessageBatch(params) {
        return new Promise((resolve, reject) => {
            this._sqs.sendMessageBatch(params, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
    }
    getQueueUrl(params) {
        return new Promise((resolve, reject) => {
            this._sqs.getQueueUrl(params, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
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
        return new Promise((resolve, reject) => {
            this._sns.createTopic(params, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
    }
    async listTopics(params) {
        return new Promise((resolve, reject) => {
            this._sns.listTopics(params, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
    }
    async getTopicAttributes(params) {
        return new Promise((resolve, reject) => {
            this._sns.getTopicAttributes(params, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
    }
    async setTopicAttributes(params) {
        return new Promise((resolve, reject) => {
            this._sns.setTopicAttributes(params, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
    }
    async deleteTopic(params) {
        return new Promise((resolve, reject) => {
            this._sns.deleteTopic(params, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
    }
    async publish(params) {
        return new Promise((resolve, reject) => {
            this._sns.publish(params, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
    }
    async subscribe(params) {
        return new Promise((resolve, reject) => {
            this._sns.subscribe(params, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
    }
    async listSubscriptions(params) {
        return new Promise((resolve, reject) => {
            this._sns.listSubscriptions(params, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
    }
    async listSubscriptionsByTopic(params) {
        return new Promise((resolve, reject) => {
            this._sns.listSubscriptionsByTopic(params, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
    }
    async confirmSubscription(params) {
        return new Promise((resolve, reject) => {
            this._sns.confirmSubscription(params, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
    }
    async unsubscribe(params) {
        return new Promise((resolve, reject) => {
            this._sns.unsubscribe(params, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
    }
    async getPublish(params) {
        var _a;
        const request = {
            uri: this._sns.endpoint.href,
            body: { Action: 'GetPublish', ...params },
        };
        const response = await this.request(request);
        return (_a = response === null || response === void 0 ? void 0 : response.GetPublishResponse) === null || _a === void 0 ? void 0 : _a.GetPublish;
    }
    async getSubscription(params) {
        var _a;
        const request = {
            uri: this._sns.endpoint.href,
            body: { Action: 'GetSubscription', ...params },
        };
        const response = await this.request(request);
        return (_a = response === null || response === void 0 ? void 0 : response.GetSubscriptionResponse) === null || _a === void 0 ? void 0 : _a.GetSubscriptionResult;
    }
    async markPublished(params) {
        const request = {
            uri: this._sns.endpoint.href,
            body: { Action: 'MarkPublished', ...params },
        };
        await this.request(request);
    }
}
exports.SQNSClient = SQNSClient;
//# sourceMappingURL=s-q-n-s-client.js.map