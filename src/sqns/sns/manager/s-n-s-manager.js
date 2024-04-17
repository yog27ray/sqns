"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SNSManager = void 0;
const encryption_1 = require("../../common/auth/encryption");
const s_q_n_s_error_1 = require("../../common/auth/s-q-n-s-error");
const a_r_n_helper_1 = require("../../common/helper/a-r-n-helper");
const common_1 = require("../../common/helper/common");
const logger_1 = require("../../common/logger/logger");
const base_manager_1 = require("../../common/model/base-manager");
const request_client_1 = require("../../common/request-client/request-client");
const s_q_n_s_client_1 = require("../../s-q-n-s-client");
const worker_event_scheduler_1 = require("../../scheduler/scheduler-worker/worker-event-scheduler");
const worker_queue_config_1 = require("../../scheduler/scheduler-worker/worker-queue-config");
const s_n_s_storage_engine_1 = require("./s-n-s-storage-engine");
const log = logger_1.logger.instance('SNSManager');
class SNSManager extends base_manager_1.BaseManager {
    constructor(snsConfig) {
        super();
        this.requestClient = new request_client_1.RequestClient();
        const sqnsClientConfig = {
            endpoint: snsConfig.queueEndpoint || snsConfig.endpoint,
            accessKeyId: snsConfig.queueAccessKey,
            secretAccessKey: snsConfig.queueSecretAccessKey,
            logging: snsConfig.logging,
        };
        this.sNSStorageEngine = new s_n_s_storage_engine_1.SNSStorageEngine(snsConfig.db);
        this.sqnsClient = new s_q_n_s_client_1.SQNSClient(sqnsClientConfig);
        if (!snsConfig.disableWorker) {
            const workerQueueConfig = new worker_queue_config_1.WorkerQueueConfig(common_1.SYSTEM_QUEUE_NAME.SNS, undefined);
            this.workerEventScheduler = new worker_event_scheduler_1.WorkerEventScheduler(sqnsClientConfig, [workerQueueConfig], undefined);
        }
    }
    createTopic(name, displayName, region, deliveryPolicy, user, attributes = { entry: [] }, tags = { member: [] }) {
        return this.sNSStorageEngine.createTopic(name, displayName, region, deliveryPolicy, user, attributes, tags);
    }
    findTopicByARN(topicARN) {
        return this.sNSStorageEngine.findTopicByARN(topicARN);
    }
    findTopics(skip) {
        return this.sNSStorageEngine.findTopics(skip);
    }
    findSubscriptions(where, skip, limit) {
        return this.sNSStorageEngine.findSubscriptions(where, skip, limit);
    }
    totalTopics(where = {}) {
        return this.sNSStorageEngine.totalTopics(where);
    }
    totalSubscriptions(where = {}) {
        return this.sNSStorageEngine.totalSubscriptions(where);
    }
    deleteTopic(topic) {
        return this.sNSStorageEngine.deleteTopic(topic);
    }
    removeSubscriptions(subscriptions) {
        return this.sNSStorageEngine.removeSubscriptions(subscriptions);
    }
    updateTopicAttributes(topic) {
        return this.sNSStorageEngine.updateTopicAttributes(topic);
    }
    async publish(topicArn, targetArn, Message, PhoneNumber, Subject, messageAttributes, messageStructure) {
        const published = await this.sNSStorageEngine.publish(topicArn, targetArn, Message, PhoneNumber, Subject, messageAttributes, messageStructure, this.generatePublishMessageStructure(messageStructure, Message));
        const deliveryPolicy = await this.findDeliveryPolicyOfArn(published.destinationArn);
        const queue = await this.sqnsClient.createQueue({ QueueName: common_1.SYSTEM_QUEUE_NAME.SNS });
        await this.sqnsClient.sendMessage({
            QueueUrl: queue.QueueUrl,
            MessageBody: `scan_publish_${published.id}`,
            MessageAttributes: {
                action: { DataType: 'String', StringValue: common_1.SNS_QUEUE_EVENT_TYPES.ScanSubscriptions },
                nextToken: { DataType: 'String', StringValue: encryption_1.Encryption.encodeNextToken({ skip: 0 }) },
                messageId: { DataType: 'String', StringValue: published.id },
                destinationArn: { DataType: 'String', StringValue: published.destinationArn },
                deliveryPolicy: { DataType: 'String', StringValue: JSON.stringify(deliveryPolicy) },
            },
            MessageDeduplicationId: `sqns_sns_publish_${published.id}`,
        });
        return published;
    }
    async findDeliveryPolicyOfArn(destinationArn) {
        const arnResource = a_r_n_helper_1.ARNHelper.findResourceClassOfARN(destinationArn);
        switch (arnResource) {
            case 'Topic': {
                const topic = await this.findTopicByARN(destinationArn);
                return topic.deliveryPolicy;
            }
            default:
                throw new s_q_n_s_error_1.SQNSError({
                    code: 'InvalidResourceARN',
                    message: 'Invalid Resource ARN',
                });
        }
    }
    generatePublishMessageStructure(messageStructure_, message) {
        let messageStructureString = messageStructure_;
        if (!messageStructureString) {
            messageStructureString = '{}';
        }
        const messageStructure = JSON.parse(messageStructureString);
        Object.keys(messageStructure).forEach((key) => {
            if (!common_1.SUPPORTED_CHANNEL.includes(key)) {
                throw new s_q_n_s_error_1.SQNSError({ code: '412', message: `"${key}" is not supported channel.` });
            }
            if (typeof messageStructure[key] !== 'string') {
                throw new s_q_n_s_error_1.SQNSError({ code: '412', message: `"${key}" value "${messageStructure[key]}" is not string.` });
            }
        });
        messageStructure.default = messageStructure.default || message;
        return messageStructure;
    }
    async subscribe(user, topic, protocol, endPoint, Attributes) {
        await this.subscriptionValidation(user, protocol, endPoint);
        return this.sNSStorageEngine.createSubscription(user, topic, protocol, endPoint, Attributes);
    }
    requestSubscriptionConfirmation(subscription, serverURL) {
        if (subscription.confirmed) {
            return;
        }
        this.sNSStorageEngine.createSubscriptionVerificationToken(subscription)
            .then((subscriptionVerificationToken) => {
            const requestBody = {
                Type: subscriptionVerificationToken.Type,
                MessageId: subscriptionVerificationToken.id,
                Token: subscriptionVerificationToken.token,
                TopicArn: subscriptionVerificationToken.TopicArn,
                Message: `You have chosen to subscribe to the topic ${subscription.topicARN}.\n`
                    + 'To confirm the subscription, visit the SubscribeURL included in this message.',
                SubscribeURL: subscriptionVerificationToken.getSubscribeURL(serverURL),
                Timestamp: subscriptionVerificationToken.createdAt.toISOString(),
            };
            const headers = {
                'Content-Type': 'application/json',
                'x-sqns-sns-message-id': subscriptionVerificationToken.id,
                'x-sqns-sns-message-type': subscriptionVerificationToken.Type,
                'x-sqns-sns-topic-arn': subscriptionVerificationToken.TopicArn,
            };
            return this.requestClient.post(subscription.endPoint, { body: JSON.stringify(requestBody), headers, json: true });
        })
            .catch((error) => {
            log.error(error);
        });
    }
    findSubscriptionVerificationToken(token) {
        return this.sNSStorageEngine.findSubscriptionVerificationToken(token);
    }
    findSubscriptionFromArn(subscriptionArn) {
        return this.sNSStorageEngine.findSubscriptionFromArn(subscriptionArn);
    }
    confirmSubscription(subscription) {
        return this.sNSStorageEngine.confirmSubscription(subscription);
    }
    findPublishById(id) {
        return this.sNSStorageEngine.findPublish(id);
    }
    markPublished(publish) {
        return this.sNSStorageEngine.markPublished(publish);
    }
    getStorageEngine() {
        return this.sNSStorageEngine;
    }
    cancel() {
        var _a;
        (_a = this.workerEventScheduler) === null || _a === void 0 ? void 0 : _a.cancel();
    }
    async subscriptionValidation(user, protocol, endPoint) {
        switch (protocol) {
            case 'sqs': {
                const arnSplitData = endPoint.split('/').reverse().splice(0, 4).reverse();
                arnSplitData[2] = user.organizationId;
                const queueARN = `arn:sqns:${arnSplitData.join(':')}`;
                await this.sNSStorageEngine.findQueueByARN(queueARN);
                return;
            }
            case 'http':
            case 'https': return;
            default:
                s_q_n_s_error_1.SQNSError.invalidSubscriptionProtocol(protocol);
        }
    }
}
exports.SNSManager = SNSManager;
//# sourceMappingURL=s-n-s-manager.js.map