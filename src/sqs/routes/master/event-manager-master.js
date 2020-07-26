"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventManagerMaster = void 0;
const aws_error_1 = require("../../aws/aws-error");
const aws_to_server_transformer_1 = require("../../aws/aws-to-server-transformer");
const aws_xml_format_1 = require("../../aws/aws-xml-format");
const express_helper_1 = require("./express-helper");
class EventManagerMaster {
    constructor(eventManager) {
        this._eventManager = eventManager;
    }
    get eventManager() {
        return this._eventManager;
    }
    eventFailure() {
        return express_helper_1.ExpressHelper.requestHandler(async (req, res) => {
            const { queueName, eventId } = req.params;
            const failureResponse = req.serverBody.failureMessage || 'Event marked failed without response.';
            await this.eventManager.updateEventStateFailure(queueName, eventId, failureResponse);
            res.status(200).json({ message: 'updated' });
        });
    }
    eventSuccess() {
        return express_helper_1.ExpressHelper.requestHandler(async (req, res) => {
            const { queueName, eventId } = req.params;
            const successResponse = req.serverBody.successMessage || 'Event marked success without response.';
            await this.eventManager.updateEventStateSuccess(queueName, eventId, successResponse);
            res.status(200).json({ message: 'updated' });
        });
    }
    sqs() {
        return express_helper_1.ExpressHelper.requestHandler(async (req, res) => {
            switch (req.body.Action) {
                case 'CreateQueue': {
                    const { name } = await this.eventManager.createQueue(req.serverBody.QueueName, aws_to_server_transformer_1.AwsToServerTransformer.transformArrayToJSON(req.serverBody.Attribute), aws_to_server_transformer_1.AwsToServerTransformer.transformArrayToJSON(req.serverBody.Tag));
                    return res.send(aws_xml_format_1.AwsXmlFormat.createQueue(req.sqsBaseURL, name));
                }
                case 'GetQueueUrl': {
                    const { name } = await this.eventManager.getQueue(req.serverBody.QueueName);
                    return res.send(aws_xml_format_1.AwsXmlFormat.getQueueURL(req.sqsBaseURL, name));
                }
                case 'DeleteQueue': {
                    await this.eventManager.deleteQueue(req.serverBody.queueName);
                    return res.send(aws_xml_format_1.AwsXmlFormat.deleteQueue());
                }
                case 'ListQueues': {
                    const queues = await this.eventManager.listQueues(req.body.QueueNamePrefix);
                    return res.send(aws_xml_format_1.AwsXmlFormat.listQueues(req.sqsBaseURL, queues));
                }
                case 'SendMessageBatch': {
                    const { queueName, SendMessageBatchRequestEntry, requestId } = req.serverBody;
                    const batchIds = SendMessageBatchRequestEntry.map((each) => each.Id);
                    const events = await this.sendMessageBatch(queueName, SendMessageBatchRequestEntry);
                    return res.send(aws_xml_format_1.AwsXmlFormat.sendMessageBatch(requestId, events, batchIds));
                }
                case 'SendMessage': {
                    const event = await this.sendMessage(req.serverBody);
                    return res.send(aws_xml_format_1.AwsXmlFormat.sendMessage(req.serverBody.requestId, event));
                }
                case 'ReceiveMessage': {
                    const { MaxNumberOfMessages, VisibilityTimeout, AttributeName, MessageAttributeName, queueName, requestId } = req.serverBody;
                    const queue = await this.eventManager.getQueue(queueName);
                    const events = await this.eventManager.receiveMessage(queue, VisibilityTimeout, MaxNumberOfMessages);
                    return res.send(aws_xml_format_1.AwsXmlFormat.receiveMessage(requestId, events, AttributeName, MessageAttributeName));
                }
                default:
                    throw new aws_error_1.AwsError({ code: 'Unhandled function', message: 'This function is not supported.' });
            }
        });
    }
    eventStats() {
        return express_helper_1.ExpressHelper.requestHandler((req, res) => {
            if (req.query.format === 'prometheus') {
                res.send(this.eventManager.prometheus());
                return;
            }
            res.json(this.eventManager.eventStats);
        });
    }
    sendMessage({ queueName, MessageBody, MessageAttribute, DelaySeconds, MessageDeduplicationId, MessageSystemAttribute }) {
        return this.eventManager.sendMessage(queueName, MessageBody, aws_to_server_transformer_1.AwsToServerTransformer.transformArrayToJSON(MessageAttribute), aws_to_server_transformer_1.AwsToServerTransformer.transformArrayToJSON(MessageSystemAttribute), DelaySeconds, MessageDeduplicationId);
    }
    async sendMessageBatch(queueName, entries) {
        const entry = entries.pop();
        if (!entry) {
            return [];
        }
        const events = await this.sendMessageBatch(queueName, entries);
        const event = await this.sendMessage({ ...entry, queueName });
        events.push(event);
        return events;
    }
}
exports.EventManagerMaster = EventManagerMaster;
//# sourceMappingURL=event-manager-master.js.map