"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsXmlFormat = void 0;
const uuid_1 = require("uuid");
const xml2js_1 = __importDefault(require("xml2js"));
const encryption_1 = require("./encryption");
class AwsXmlFormat {
    static jsonToXML(rootName, keyValue) {
        const builder = new xml2js_1.default.Builder({ rootName });
        return builder.buildObject(keyValue);
    }
    static errorResponse(requestId, code, message, details) {
        const json = {
            RequestId: requestId,
            Error: {
                Type: 'Sender',
                Code: code,
                Message: message,
                Detail: details,
            },
        };
        return AwsXmlFormat.jsonToXML('ErrorResponse', json);
    }
    static createQueue(requestId, host, queue) {
        const json = {
            CreateQueueResult: { QueueUrl: AwsXmlFormat.generateSQSURL(queue, host) },
            ResponseMetadata: { RequestId: requestId },
        };
        return AwsXmlFormat.jsonToXML('CreateQueueResponse', json);
    }
    static getQueueURL(requestId, host, queue) {
        const json = {
            GetQueueUrlResult: { QueueUrl: AwsXmlFormat.generateSQSURL(queue, host) },
            ResponseMetadata: { RequestId: requestId },
        };
        return AwsXmlFormat.jsonToXML('GetQueueURLResponse', json);
    }
    static getSubscription(requestId, host, subscription) {
        const Attributes = {};
        subscription.Attributes.entry.forEach(({ key, value }) => Attributes[key] = value);
        const json = {
            GetSubscriptionResult: {
                Protocol: subscription.protocol,
                EndPoint: subscription.endPoint,
                Attributes,
                TopicARN: subscription.topicARN,
                ARN: subscription.arn,
                UnsubscribeUrl: subscription.getUnSubscribeURL(host),
            },
            ResponseMetadata: { RequestId: requestId },
        };
        return AwsXmlFormat.jsonToXML('GetSubscriptionResponse', json);
    }
    static deleteQueue(requestId) {
        const json = { ResponseMetadata: { RequestId: requestId } };
        return AwsXmlFormat.jsonToXML('DeleteQueueResponse', json);
    }
    static listQueues(requestId, host, queues) {
        const json = {
            ListQueuesResult: { QueueUrl: queues.map((queue) => AwsXmlFormat.generateSQSURL(queue, host)) },
            ResponseMetadata: { RequestId: requestId },
        };
        return AwsXmlFormat.jsonToXML('ListQueuesResponse', json);
    }
    static sendMessage(requestId, event) {
        const json = {
            SendMessageResult: AwsXmlFormat.generateSendMessageResponse(event),
            ResponseMetadata: { RequestId: requestId },
        };
        return AwsXmlFormat.jsonToXML('SendMessageResponse', json);
    }
    static generateSendMessageResponse(event) {
        return {
            MessageId: event.id,
            MD5OfMessageBody: AwsXmlFormat.md5Hash(event.MessageBody),
            MD5OfMessageAttributes: AwsXmlFormat.md5HashJSON(event.MessageAttribute),
        };
    }
    static sendMessageBatch(requestId, events, batchIds) {
        const eventsResponse = events.map((event) => AwsXmlFormat.generateSendMessageResponse(event));
        eventsResponse.forEach((each, index) => {
            Object.assign(each, { Id: batchIds[index] });
        });
        const json = {
            SendMessageBatchResult: { SendMessageBatchResultEntry: eventsResponse },
            ResponseMetadata: { RequestId: requestId },
        };
        return AwsXmlFormat.jsonToXML('SendMessageBatchResponse', json);
    }
    static receiveMessage(requestId, messages, AttributeName, MessageAttributeName) {
        const json = {
            ResponseMetadata: { RequestId: requestId },
            ReceiveMessageResult: {
                Message: messages.map((message) => AwsXmlFormat.responseMessage(message, AttributeName, MessageAttributeName)),
            },
        };
        return AwsXmlFormat.jsonToXML('ReceiveMessageResponse', json);
    }
    static createTopic(requestId, topic) {
        const json = {
            CreateTopicResult: { TopicArn: topic.arn },
            ResponseMetadata: {
                RequestId: requestId,
            },
        };
        return AwsXmlFormat.jsonToXML('CreateTopicResponse', json);
    }
    static listTopicsResult(requestId, topics, skip, total) {
        const json = {
            ListTopicsResult: { Topics: { member: topics.map((topic) => ({ TopicArn: topic.arn })) } },
            ResponseMetadata: { RequestId: requestId },
        };
        if ((skip + topics.length) < total) {
            json.ListTopicsResult.NextToken = encryption_1.Encryption.encodeNextToken({ skip: skip + topics.length });
        }
        return AwsXmlFormat.jsonToXML('ListTopicsResponse', json);
    }
    static deleteTopic(requestId) {
        const json = { ResponseMetadata: { RequestId: requestId } };
        return AwsXmlFormat.jsonToXML('DeleteTopicResponse', json);
    }
    static setTopicAttributes(requestId) {
        const json = { ResponseMetadata: { RequestId: requestId } };
        return AwsXmlFormat.jsonToXML('SetTopicAttributesResponse', json);
    }
    static publish(requestId, publish) {
        const json = {
            PublishResult: { MessageId: publish.id },
            ResponseMetadata: { RequestId: requestId },
        };
        return AwsXmlFormat.jsonToXML('PublishResponse', json);
    }
    static subscribe(requestId, subscription, ReturnSubscriptionArn) {
        const json = {
            SubscribeResult: { SubscriptionArn: this.getSubscriptionARN(subscription, ReturnSubscriptionArn) },
            ResponseMetadata: { RequestId: requestId },
        };
        return AwsXmlFormat.jsonToXML('SubscribeResponse', json);
    }
    static confirmSubscription(requestId, subscription) {
        const json = {
            ConfirmSubscriptionResult: { SubscriptionArn: this.getSubscriptionARN(subscription) },
            ResponseMetadata: { RequestId: requestId },
        };
        return AwsXmlFormat.jsonToXML('ConfirmSubscriptionResponse', json);
    }
    static unSubscribeSubscription(requestId) {
        const json = {
            UnsubscribeResult: {},
            ResponseMetadata: { RequestId: requestId },
        };
        return AwsXmlFormat.jsonToXML('UnsubscribeResponse', json);
    }
    static getPublish(requestId, publish) {
        const publishJSON = {
            MessageId: publish.id,
            MessageAttributes: (publish.MessageAttributes || { entry: [] }).entry,
            PublishArn: publish.destinationArn,
        };
        ['Message', 'PhoneNumber', 'Subject', 'MessageStructure', 'Status'].forEach((key) => {
            if (publish[key]) {
                publishJSON[key] = publish[key];
            }
        });
        const json = {
            GetPublish: publishJSON,
            ResponseMetadata: { RequestId: requestId },
        };
        return AwsXmlFormat.jsonToXML('GetPublishResponse', json);
    }
    static markPublished(requestId) {
        const json = {
            ResponseMetadata: { RequestId: requestId },
        };
        return AwsXmlFormat.jsonToXML('MarkPublishedResponse', json);
    }
    static getTopicAttributes(requestId, topic) {
        const entry = topic.attributes.entry
            .filter((each) => !['DeliveryPolicy'].includes(each.key))
            .map((each) => each);
        entry.push({ key: 'SubscriptionsConfirmed', value: '0' });
        entry.push({ key: 'SubscriptionsPending', value: '0' });
        entry.push({ key: 'SubscriptionsDeleted', value: '0' });
        entry.push({ key: 'TopicArn', value: topic.arn });
        entry.push({ key: 'EffectiveDeliveryPolicy', value: JSON.stringify(topic.deliveryPolicy) });
        const json = {
            GetTopicAttributesResult: { Attributes: { entry } },
            ResponseMetadata: { RequestId: requestId },
        };
        return AwsXmlFormat.jsonToXML('GetTopicAttributesResponse', json);
    }
    static listSubscriptionsResult(requestId, subscriptions, skip, total) {
        const json = {
            ListSubscriptionsResult: {
                Subscriptions: {
                    member: subscriptions.map((subscription) => ({
                        Protocol: subscription.protocol,
                        Endpoint: subscription.endPoint,
                        SubscriptionArn: this.getSubscriptionARN(subscription),
                        TopicArn: subscription.topicARN,
                    })),
                },
            },
            ResponseMetadata: { RequestId: requestId },
        };
        if ((skip + subscriptions.length) < total) {
            json.ListSubscriptionsResult.NextToken = Buffer.from(JSON.stringify({ skip: skip + subscriptions.length })).toString('base64');
        }
        return AwsXmlFormat.jsonToXML('ListSubscriptionsResponse', json);
    }
    static listSubscriptionsByTopicResult(requestId, subscriptions, skip, total) {
        const json = {
            ListSubscriptionsByTopicResult: {
                Subscriptions: {
                    member: subscriptions.map((subscription) => ({
                        Protocol: subscription.protocol,
                        Endpoint: subscription.endPoint,
                        SubscriptionArn: this.getSubscriptionARN(subscription),
                        TopicArn: subscription.topicARN,
                    })),
                },
            },
            ResponseMetadata: { RequestId: requestId },
        };
        if ((skip + subscriptions.length) < total) {
            json.ListSubscriptionsByTopicResult.NextToken = Buffer.from(JSON.stringify({ skip: skip + subscriptions.length })).toString('base64');
        }
        return AwsXmlFormat.jsonToXML('ListSubscriptionsByTopicResponse', json);
    }
    static getSubscriptionARN(subscription, ReturnSubscriptionArn) {
        return subscription.confirmed || ReturnSubscriptionArn ? subscription.arn : 'PendingConfirmation';
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
                SenderId: event.queueARN,
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
        return encryption_1.Encryption.createHash('md5', message);
    }
    static generateSQSURL(queue, baseURL) {
        return `${baseURL}/sqs/${queue.region}/${queue.companyId}/${queue.name}`;
    }
}
exports.AwsXmlFormat = AwsXmlFormat;
//# sourceMappingURL=aws-xml-format.js.map