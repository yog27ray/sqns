"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsXmlFormat = void 0;
const crypto_1 = __importDefault(require("crypto"));
const uuid_1 = require("uuid");
const xml2js_1 = __importDefault(require("xml2js"));
class AwsXmlFormat {
    static errorResponse(code, message, details) {
        const builder = new xml2js_1.default.Builder({ rootName: 'ErrorResponse' });
        const errorJSON = {
            Error: {
                Type: 'Sender',
                Code: code,
                Message: message,
                Detail: details,
            },
            RequestId: 'cdd49001-ea49-5cbd-b098-c74c65559f22',
        };
        return builder.buildObject(errorJSON);
    }
    static createQueue(host, queue) {
        const builder = new xml2js_1.default.Builder({ rootName: 'CreateQueueResponse' });
        const json = {
            CreateQueueResult: { QueueUrl: AwsXmlFormat.generateSQSURL(queue, host) },
            ResponseMetadata: { RequestId: '29637ffb-6ecd-54d0-8313-28b470a7bdf1' },
        };
        return builder.buildObject(json);
    }
    static getQueueURL(host, queue) {
        const builder = new xml2js_1.default.Builder({ rootName: 'GetQueueURLResponse' });
        const json = {
            GetQueueUrlResult: { QueueUrl: AwsXmlFormat.generateSQSURL(queue, host) },
            ResponseMetadata: { RequestId: '29637ffb-6ecd-54d0-8313-28b470a7bdf1' },
        };
        return builder.buildObject(json);
    }
    static deleteQueue() {
        const builder = new xml2js_1.default.Builder({ rootName: 'DeleteQueueResponse' });
        const json = { ResponseMetadata: { RequestId: '29637ffb-6ecd-54d0-8313-28b470a7bdf1' } };
        return builder.buildObject(json);
    }
    static listQueues(host, queues) {
        const builder = new xml2js_1.default.Builder({ rootName: 'ListQueuesResponse' });
        const json = {
            ListQueuesResult: { QueueUrl: queues.map((queue) => AwsXmlFormat.generateSQSURL(queue.name, host)) },
            ResponseMetadata: { RequestId: 'bf4e3b3d-6019-59fe-a3fd-6c7090c8f0a9' },
        };
        return builder.buildObject(json);
    }
    static sendMessage(requestId, event) {
        const builder = new xml2js_1.default.Builder({ rootName: 'SendMessageResponse' });
        const json = {
            SendMessageResult: AwsXmlFormat.generateSendMessageResponse(event),
            ResponseMetadata: { RequestId: requestId },
        };
        return builder.buildObject(json);
    }
    static generateSendMessageResponse(event) {
        return {
            MessageId: event.id,
            MD5OfMessageBody: AwsXmlFormat.md5Hash(event.MessageBody),
            MD5OfMessageAttributes: AwsXmlFormat.md5HashJSON(event.MessageAttribute),
        };
    }
    static sendMessageBatch(requestId, events, batchIds) {
        const builder = new xml2js_1.default.Builder({ rootName: 'SendMessageBatchResponse' });
        const eventsResponse = events.map((event) => AwsXmlFormat.generateSendMessageResponse(event));
        eventsResponse.forEach((each, index) => {
            Object.assign(each, { Id: batchIds[index] });
        });
        const json = {
            SendMessageBatchResult: { SendMessageBatchResultEntry: eventsResponse },
            ResponseMetadata: { RequestId: requestId },
        };
        return builder.buildObject(json);
    }
    static receiveMessage(requestId, messages, AttributeName, MessageAttributeName) {
        const builder = new xml2js_1.default.Builder({ rootName: 'ReceiveMessageResponse' });
        const json = {
            ResponseMetadata: { RequestId: requestId },
            ReceiveMessageResult: {
                Message: messages.map((message) => AwsXmlFormat.responseMessage(message, AttributeName, MessageAttributeName)),
            },
        };
        return builder.buildObject(json);
    }
    static responseMessage(event, AttributeName, MessageAttributeName) {
        const result = {
            MessageId: event.id,
            ReceiptHandle: uuid_1.v4(),
            MD5OfBody: AwsXmlFormat.md5Hash(event.MessageBody),
            Body: event.MessageBody,
        };
        if (MessageAttributeName) {
            const attributeFields = Object.keys(event.MessageAttribute)
                .filter((each) => MessageAttributeName.includes('ALL') || MessageAttributeName.includes(each));
            result.MessageAttribute = attributeFields.map((key) => ({ Name: key, Value: event.MessageAttribute[key] }));
        }
        if (AttributeName) {
            const eventSystemAttribute = {};
            Object.keys(event.MessageSystemAttribute)
                .forEach((key) => {
                eventSystemAttribute[key] = event.MessageSystemAttribute[key].StringValue;
            });
            const attributes = {
                ...eventSystemAttribute,
                SenderId: event.queueId,
                ApproximateFirstReceiveTimestamp: `${event.firstSentTime.getTime()}`,
                ApproximateReceiveCount: `${event.receiveCount}`,
                SentTimestamp: `${event.sentTime.getTime()}`,
            };
            const attributeFields = Object.keys(attributes)
                .filter((each) => AttributeName.includes('ALL') || AttributeName.includes(each));
            result.Attribute = attributeFields.map((key) => ({ Name: key, Value: attributes[key] }));
        }
        return result;
    }
    static md5HashJSON(json) {
        const message = Object.keys(json).sort().map((key) => `${key}=${encodeURIComponent(json[key])}`).join('&');
        return AwsXmlFormat.md5Hash(message);
    }
    static md5Hash(message) {
        return crypto_1.default.createHash('md5').update(message).digest('hex');
    }
    static generateSQSURL(queueName, baseURL) {
        return `${baseURL}/sqs/queue/${queueName}`;
    }
}
exports.AwsXmlFormat = AwsXmlFormat;
//# sourceMappingURL=aws-xml-format.js.map