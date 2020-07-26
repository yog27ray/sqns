"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleQueueServerClient = void 0;
const sqs_1 = __importDefault(require("aws-sdk/clients/sqs"));
const moment_1 = __importDefault(require("moment"));
const request_promise_1 = __importDefault(require("request-promise"));
const xml2js_1 = require("xml2js");
const aws_authentication_1 = require("./aws-authentication");
const aws_error_1 = require("./aws-error");
class SimpleQueueServerClient {
    constructor(options) {
        if (options.endpoint) {
            Object.assign(options, { endpoint: `${options.endpoint}/sqs` });
        }
        this.sqs = new sqs_1.default(options);
    }
    listQueues(params = {}) {
        return new Promise((resolve, reject) => {
            this.sqs.listQueues(params, (error, queuesResult_) => {
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
    createQueue(params) {
        return new Promise((resolve, reject) => {
            this.sqs.createQueue(params, (error, result) => {
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
            this.sqs.getQueueUrl(params, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
    }
    deleteQueue(params) {
        return new Promise((resolve, reject) => {
            this.sqs.deleteQueue(params, (error, result) => {
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
            this.sqs.sendMessage(params, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
    }
    receiveMessage(params) {
        return new Promise((resolve, reject) => {
            this.sqs.receiveMessage(params, (error, result_) => {
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
    sendMessageBatch(params) {
        return new Promise((resolve, reject) => {
            this.sqs.sendMessageBatch(params, (error, result) => {
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
            method: 'POST',
            uri: `${QueueUrl}/event/${MessageId}/success`,
            body: { successMessage },
            json: true,
        };
        await this.request(request);
    }
    async markEventFailure(MessageId, QueueUrl, failureMessage = '') {
        const request = {
            method: 'POST',
            uri: `${QueueUrl}/event/${MessageId}/failure`,
            body: { failureMessage },
            json: true,
        };
        await this.request(request);
    }
    async request(request) {
        const headers = {
            'x-amz-date': moment_1.default().utc().format('YYYYMMDDTHHmmss'),
            host: request.uri.split('/')[2],
        };
        const authorization = aws_authentication_1.generateAuthorizationHash(this.sqs.config.accessKeyId, this.sqs.config.secretAccessKey, this.sqs.config.region, headers['x-amz-date'], headers.host, request.uri.split(headers.host)[1], request.method, request.body);
        request.headers = { ...(request.headers || {}), ...headers, authorization };
        await request_promise_1.default(request)
            .catch((error) => new Promise((resolve, reject) => {
            xml2js_1.parseString(error.error, (parserError, result) => {
                if (parserError) {
                    reject(new aws_error_1.AwsError({ code: error.statusCode, message: error.error }));
                    return;
                }
                const { Code: [code], Message: [message] } = result.ErrorResponse.Error[0];
                reject(new aws_error_1.AwsError({ code, message }));
            });
        }));
    }
}
exports.SimpleQueueServerClient = SimpleQueueServerClient;
//# sourceMappingURL=index.js.map