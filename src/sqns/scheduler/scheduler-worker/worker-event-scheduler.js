"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerEventScheduler = void 0;
const schedule = __importStar(require("node-schedule"));
const common_1 = require("../../common/helper/common");
const delivery_policy_helper_1 = require("../../common/helper/delivery-policy-helper");
const logger_1 = require("../../common/logger/logger");
const s_q_n_s_client_1 = require("../../s-q-n-s-client");
const log = logger_1.logger.instance('WorkerEventScheduler');
class WorkerEventScheduler {
    constructor(options, queueConfigs, cronInterval) {
        this.queueNames = [];
        this.queueConfigs = {};
        queueConfigs.forEach((each) => {
            this.queueConfigs[each.queueName] = each.clone();
            this.queueNames.push(this.queueConfigs[each.queueName].queueName);
        });
        this.sqnsClient = new s_q_n_s_client_1.SQNSClient(options);
        this.initialize(cronInterval);
    }
    cancel() {
        var _a;
        (_a = this.job) === null || _a === void 0 ? void 0 : _a.cancel();
    }
    async processSnsEvents(workerQueueConfig, responseItem) {
        const action = responseItem.MessageAttributes.action.StringValue;
        switch (action) {
            case common_1.SNS_QUEUE_EVENT_TYPES.ScanSubscriptions: {
                return this.snsQueueEventScanSubscription(workerQueueConfig, responseItem);
            }
            case common_1.SNS_QUEUE_EVENT_TYPES.ProcessSubscription: {
                return this.snsQueueEventProcessSubscription(responseItem);
            }
            default:
                throw Error(`Unhandled action: "${action}"`);
        }
    }
    async snsQueueEventScanSubscription(workerQueueConfig, responseItem) {
        const nextToken = responseItem.MessageAttributes.nextToken.StringValue;
        const destinationArn = responseItem.MessageAttributes.destinationArn.StringValue;
        const messageId = responseItem.MessageAttributes.messageId.StringValue;
        const deliveryPolicy = JSON.parse(responseItem.MessageAttributes.deliveryPolicy.StringValue);
        const { Subscriptions, NextToken } = await this.sqnsClient.listSubscriptionsByTopic({ TopicArn: destinationArn, NextToken: nextToken });
        if (!Subscriptions.length) {
            await this.sqnsClient.markPublished({ MessageId: messageId });
            return 'no-subscription-found';
        }
        await Promise.all(Subscriptions.map(async ({ SubscriptionArn }) => {
            const subscription = await this.sqnsClient.getSubscription({ SubscriptionArn });
            const effectiveDeliveryPolicy = delivery_policy_helper_1.DeliveryPolicyHelper.getEffectiveChannelDeliveryPolicyForSubscription(deliveryPolicy, subscription);
            const uniqueId = `process_publish_${messageId}_subscription_${subscription.ARN}`;
            await this.sqnsClient.sendMessage({
                QueueUrl: workerQueueConfig.queue.QueueUrl,
                MessageBody: uniqueId,
                MessageAttributes: {
                    action: { DataType: 'String', StringValue: common_1.SNS_QUEUE_EVENT_TYPES.ProcessSubscription },
                    messageId: { DataType: 'String', StringValue: messageId },
                    subscriptionArn: { DataType: 'String', StringValue: subscription.ARN },
                    DeliveryPolicy: { DataType: 'String', StringValue: JSON.stringify(effectiveDeliveryPolicy) },
                },
                MessageDeduplicationId: uniqueId,
            });
        }));
        if (NextToken) {
            const uniqueId = `scan_publish_${messageId}_nextToken_${NextToken}`;
            await this.sqnsClient.sendMessage({
                QueueUrl: workerQueueConfig.queue.QueueUrl,
                MessageBody: uniqueId,
                MessageAttributes: {
                    action: { DataType: 'String', StringValue: common_1.SNS_QUEUE_EVENT_TYPES.ScanSubscriptions },
                    nextToken: { DataType: 'String', StringValue: NextToken },
                    messageId: { DataType: 'String', StringValue: messageId },
                    destinationArn: { DataType: 'String', StringValue: destinationArn },
                    deliveryPolicy: responseItem.MessageAttributes.deliveryPolicy,
                },
                MessageDeduplicationId: uniqueId,
            });
            return 'created-new-scan-event';
        }
        await this.sqnsClient.markPublished({ MessageId: messageId });
        return 'created-all-subscription-event';
    }
    async snsQueueEventProcessSubscription(responseItem) {
        const subscriptionArn = responseItem.MessageAttributes.subscriptionArn.StringValue;
        const messageId = responseItem.MessageAttributes.messageId.StringValue;
        const published = await this.sqnsClient.getPublish({ MessageId: messageId });
        const subscription = await this.sqnsClient.getSubscription({ SubscriptionArn: subscriptionArn });
        switch (subscription.Protocol) {
            case 'http':
            case 'https': {
                const headers = subscription.Attributes.headers ? JSON.parse(subscription.Attributes.headers) : {};
                const response = await this.sqnsClient.post(subscription.EndPoint, {
                    body: JSON.stringify({
                        Type: 'Notification',
                        MessageId: messageId,
                        TopicArn: subscription.TopicARN,
                        Subject: published.Subject,
                        Message: published.Message,
                        UnsubscribeURL: subscription.UnsubscribeUrl,
                        SubscriptionArn: subscriptionArn,
                        MessageAttributes: published.MessageAttributes,
                    }),
                    headers: {
                        ...headers,
                        'x-sqns-sns-message-id': messageId,
                        'x-sqns-sns-message-type': 'Notification',
                        'x-sqns-sns-topic-arn': subscription.TopicARN,
                        'x-sqns-sns-subscription-arn': subscriptionArn,
                    },
                    jsonBody: true,
                });
                return response;
            }
            default:
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                throw Error(`Unhandled Protocol: "${subscription.Protocol}"`);
        }
    }
    initialize(cronInterval = '15 * * * * *') {
        log.info('Adding scheduler job for event slave.');
        this.job = schedule.scheduleJob(cronInterval, () => {
            log.info('Executing Worker Job Interval');
            const queuesNotPollingEvent = this.queueNames.filter((queueName) => !this.queueConfigs[queueName].polling);
            log.info('Queues to start event polling:', queuesNotPollingEvent);
            queuesNotPollingEvent.forEach((queueName) => this.checkIfMoreItemsCanBeProcessed(this.queueConfigs[queueName]));
        });
    }
    checkIfMoreItemsCanBeProcessed(workerQueueConfig_) {
        const workerQueueConfig = workerQueueConfig_;
        workerQueueConfig.polling = true;
        if (workerQueueConfig.config.count >= workerQueueConfig.config.MAX_COUNT) {
            log.info('Queue:', workerQueueConfig.queueName, 'already maximum task running.');
            return;
        }
        while (workerQueueConfig.config.count < workerQueueConfig.config.MAX_COUNT && workerQueueConfig.hasMore) {
            log.info('Queue:', workerQueueConfig.queueName, 'Processing new event.');
            this.requestEventToProcessAsynchronous(workerQueueConfig);
        }
        if (!workerQueueConfig.config.count && !workerQueueConfig.hasMore) {
            log.info('Queue:', workerQueueConfig.queueName, 'No events to process reset status.');
            workerQueueConfig.polling = false;
            workerQueueConfig.hasMore = true;
        }
    }
    async findOrCreateQueue(workerQueueConfig_) {
        const workerQueueConfig = workerQueueConfig_;
        if (workerQueueConfig.queue) {
            return;
        }
        workerQueueConfig.queue = await this.sqnsClient.createQueue({ QueueName: workerQueueConfig.queueName });
    }
    requestEventToProcessAsynchronous(workerQueueConfig_) {
        const workerQueueConfig = workerQueueConfig_;
        workerQueueConfig.config.count += 1;
        this.requestEventToProcess(workerQueueConfig)
            .then(() => {
            workerQueueConfig.config.count -= 1;
            this.checkIfMoreItemsCanBeProcessed(workerQueueConfig);
            return 0;
        })
            .catch((error) => {
            log.error(error);
            workerQueueConfig.hasMore = false;
            workerQueueConfig.config.count -= 1;
            this.checkIfMoreItemsCanBeProcessed(workerQueueConfig);
        });
    }
    async requestEventToProcess(workerQueueConfig_) {
        const workerQueueConfig = workerQueueConfig_;
        await this.findOrCreateQueue(workerQueueConfig);
        const result = await this.sqnsClient.receiveMessage({ QueueUrl: workerQueueConfig.queue.QueueUrl, MessageAttributeNames: ['ALL'] });
        const { Messages: [eventItem] } = result;
        if (!eventItem) {
            workerQueueConfig.hasMore = false;
        }
        else {
            const [isSuccess, response] = await this.processEvent(workerQueueConfig, eventItem);
            if (isSuccess) {
                await this.sqnsClient.markEventSuccess(eventItem.MessageId, workerQueueConfig.queue.QueueUrl, response);
            }
            else {
                await this.sqnsClient.markEventFailure(eventItem.MessageId, workerQueueConfig.queue.QueueUrl, response);
            }
        }
    }
    async processEvent(workerQueueConfig, responseItem) {
        try {
            let response;
            switch (workerQueueConfig.queueName) {
                case common_1.SYSTEM_QUEUE_NAME.SNS: {
                    response = await this.processSnsEvents(workerQueueConfig, responseItem);
                    break;
                }
                default:
                    response = await workerQueueConfig.listener(workerQueueConfig.queueName, responseItem);
            }
            return [true, response];
        }
        catch (error) {
            log.error(error);
            return [false, error.message];
        }
    }
}
exports.WorkerEventScheduler = WorkerEventScheduler;
//# sourceMappingURL=worker-event-scheduler.js.map