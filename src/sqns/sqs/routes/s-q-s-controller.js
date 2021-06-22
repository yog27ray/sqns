"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQSController = void 0;
const aws_to_server_transformer_1 = require("../../common/auth/aws-to-server-transformer");
const aws_xml_format_1 = require("../../common/auth/aws-xml-format");
const s_q_n_s_error_1 = require("../../common/auth/s-q-n-s-error");
const common_1 = require("../../common/helper/common");
const queue_1 = require("../../common/model/queue");
const express_helper_1 = require("../../common/routes/express-helper");
class SQSController {
    constructor(eventManager) {
        this._eventManager = eventManager;
    }
    get eventManager() {
        return this._eventManager;
    }
    eventFailure() {
        return express_helper_1.ExpressHelper.requestHandler(async (req, res) => {
            const { queueName, eventId, region } = req.params;
            const failureResponse = req.serverBody.failureMessage || 'Event marked failed without response.';
            const queue = await this.eventManager.getQueue(queue_1.Queue.arn(req.user.organizationId, region, queueName));
            await this.eventManager.updateEventStateFailure(queue, eventId, failureResponse);
            res.status(200).send(aws_xml_format_1.AwsXmlFormat.jsonToXML('Response', { message: 'updated' }));
        });
    }
    eventSuccess() {
        return express_helper_1.ExpressHelper.requestHandler(async (req, res) => {
            const { queueName, eventId, region } = req.params;
            const successResponse = req.serverBody.successMessage || 'Event marked success without response.';
            const queue = await this.eventManager.getQueue(queue_1.Queue.arn(req.user.organizationId, region, queueName));
            await this.eventManager.updateEventStateSuccess(queue, eventId, successResponse);
            res.status(200).send(aws_xml_format_1.AwsXmlFormat.jsonToXML('Response', { message: 'updated' }));
        });
    }
    sqs() {
        return express_helper_1.ExpressHelper.requestHandler(async (req, res) => {
            switch (req.body.Action) {
                case 'CreateQueue': {
                    const { QueueName, region, Attribute, Tag, requestId } = req.serverBody;
                    let queue = await this.eventManager.getQueue(queue_1.Queue.arn(req.user.organizationId, region, QueueName)).catch(() => undefined);
                    if (!queue) {
                        queue = await this.eventManager.createQueue(req.user, QueueName, region, aws_to_server_transformer_1.AwsToServerTransformer.transformArrayToJSON(Attribute), aws_to_server_transformer_1.AwsToServerTransformer.transformArrayToJSON(Tag));
                    }
                    return res.send(aws_xml_format_1.AwsXmlFormat.createQueue(requestId, req.sqnsBaseURL, queue));
                }
                case 'GetQueueUrl': {
                    const { QueueName, region, requestId } = req.serverBody;
                    const queue = await this.eventManager.getQueue(queue_1.Queue.arn(req.user.organizationId, region, QueueName));
                    return res.send(aws_xml_format_1.AwsXmlFormat.getQueueURL(requestId, req.sqnsBaseURL, queue));
                }
                case 'DeleteQueue': {
                    const { queueName, region, requestId } = req.serverBody;
                    if (common_1.RESERVED_QUEUE_NAME.includes(queueName)) {
                        s_q_n_s_error_1.SQNSError.reservedQueueNames();
                    }
                    const queue = await this.eventManager.getQueue(queue_1.Queue.arn(req.user.organizationId, region, queueName));
                    await this.eventManager.deleteQueue(queue);
                    return res.send(aws_xml_format_1.AwsXmlFormat.deleteQueue(requestId));
                }
                case 'ListQueues': {
                    const { requestId, QueueNamePrefix, region } = req.serverBody;
                    const queues = await this.eventManager.listQueues(queue_1.Queue.arn(req.user.organizationId, region, QueueNamePrefix || ''));
                    return res.send(aws_xml_format_1.AwsXmlFormat.listQueues(requestId, req.sqnsBaseURL, queues));
                }
                case 'SendMessageBatch': {
                    const { queueName, SendMessageBatchRequestEntry, requestId, region } = req.serverBody;
                    const batchIds = SendMessageBatchRequestEntry.map((each) => each.Id);
                    const queue = await this.eventManager.getQueue(queue_1.Queue.arn(req.user.organizationId, region, queueName));
                    const events = await this.sendMessageBatch(queue, SendMessageBatchRequestEntry);
                    return res.send(aws_xml_format_1.AwsXmlFormat.sendMessageBatch(requestId, events, batchIds));
                }
                case 'SendMessage': {
                    const { queueName, MessageBody, MessageAttribute, DelaySeconds, MessageDeduplicationId, MessageSystemAttribute, region, } = req.serverBody;
                    const queue = await this.eventManager.getQueue(queue_1.Queue.arn(req.user.organizationId, region, queueName));
                    const event = await this.sendMessage(queue, {
                        MessageBody,
                        MessageAttribute,
                        DelaySeconds,
                        MessageDeduplicationId,
                        MessageSystemAttribute,
                    });
                    return res.send(aws_xml_format_1.AwsXmlFormat.sendMessage(req.serverBody.requestId, event));
                }
                case 'FindMessageById': {
                    const { queueName, region, MessageId, requestId } = req.serverBody;
                    const queue = await this.eventManager.getQueue(queue_1.Queue.arn(req.user.organizationId, region, queueName));
                    const eventItem = await this.eventManager.findMessageById(queue, MessageId);
                    return res.send(aws_xml_format_1.AwsXmlFormat.findMessageById(requestId, eventItem));
                }
                case 'UpdateMessageById': {
                    const { MessageId, queueName, DelaySeconds, State, region, requestId, } = req.serverBody;
                    const queue = await this.eventManager.getQueue(queue_1.Queue.arn(req.user.organizationId, region, queueName));
                    const eventItem = await this.eventManager.findMessageById(queue, MessageId);
                    eventItem.setState(State);
                    eventItem.setDelaySeconds(DelaySeconds);
                    await this.eventManager.updateEvent(queue, eventItem);
                    return res.send(aws_xml_format_1.AwsXmlFormat.findMessageById(requestId, eventItem));
                }
                case 'ReceiveMessage': {
                    const { MaxNumberOfMessages, VisibilityTimeout, AttributeName, MessageAttributeName, queueName, requestId, region, } = req.serverBody;
                    const queue = await this.eventManager.getQueue(queue_1.Queue.arn(req.user.organizationId, region, queueName));
                    const events = await this.eventManager.receiveMessage(queue, VisibilityTimeout, MaxNumberOfMessages);
                    return res.send(aws_xml_format_1.AwsXmlFormat.receiveMessage(requestId, events, AttributeName, MessageAttributeName));
                }
                default:
                    throw new s_q_n_s_error_1.SQNSError({ code: 'Unhandled function', message: 'This function is not supported.' });
            }
        });
    }
    eventStats() {
        return express_helper_1.ExpressHelper.requestHandler((req, res) => {
            if (req.query.format === 'prometheus') {
                res.send(this.eventManager.prometheus());
                return Promise.resolve();
            }
            res.json(this.eventManager.eventStats);
            return Promise.resolve();
        });
    }
    async sendMessage(queue, sendMessageReceived) {
        return this.eventManager.sendMessage(queue, sendMessageReceived.MessageBody, aws_to_server_transformer_1.AwsToServerTransformer.transformArrayToJSON(sendMessageReceived.MessageAttribute), aws_to_server_transformer_1.AwsToServerTransformer.transformArrayToJSON(sendMessageReceived.MessageSystemAttribute), sendMessageReceived.DelaySeconds, sendMessageReceived.MessageDeduplicationId);
    }
    async sendMessageBatch(queue, entries) {
        const entry = entries.pop();
        if (!entry) {
            return [];
        }
        const events = await this.sendMessageBatch(queue, entries);
        const event = await this.sendMessage(queue, entry);
        events.push(event);
        return events;
    }
}
exports.SQSController = SQSController;
//# sourceMappingURL=s-q-s-controller.js.map