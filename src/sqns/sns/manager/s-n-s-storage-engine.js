"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SNSStorageEngine = void 0;
const uuid_1 = require("uuid");
const encryption_1 = require("../../common/auth/encryption");
const s_q_n_s_error_1 = require("../../common/auth/s-q-n-s-error");
const delivery_policy_helper_1 = require("../../common/helper/delivery-policy-helper");
const base_storage_engine_1 = require("../../common/model/base-storage-engine");
const publish_1 = require("../../common/model/publish");
class SNSStorageEngine extends base_storage_engine_1.BaseStorageEngine {
    async createTopic(name, displayName, region, deliveryPolicy, user, attributes, tags) {
        const [topic] = await this._storageAdapter.findTopics({ name }, 0, 1);
        if (topic) {
            return topic;
        }
        return this._storageAdapter.createTopic(name, displayName, region, deliveryPolicy, user, attributes, tags);
    }
    async findTopicByARN(topicARN) {
        const topic = await this._storageAdapter.findTopicARN(topicARN);
        if (!topic) {
            s_q_n_s_error_1.SQNSError.invalidTopic();
        }
        return topic;
    }
    findTopics(skip) {
        return this._storageAdapter.findTopics({}, skip, 100);
    }
    findSubscriptions(where, skip, limit) {
        return this._storageAdapter.findSubscriptions(where, skip, limit);
    }
    totalTopics(where) {
        return this._storageAdapter.totalTopics(where);
    }
    totalSubscriptions(where) {
        return this._storageAdapter.totalSubscriptions(where);
    }
    async deleteTopic(topic) {
        return this._storageAdapter.deleteTopic(topic);
    }
    async removeSubscriptions(subscriptions) {
        return this._storageAdapter.removeSubscriptions(subscriptions);
    }
    updateTopicAttributes(topic) {
        return this._storageAdapter.updateTopicAttributes(topic);
    }
    async createSubscription(user, topic, protocol, endPoint, Attributes = { entry: [] }) {
        var _a;
        const subscription = await this.findSubscription(topic, protocol, endPoint);
        if (subscription) {
            return subscription;
        }
        const channelDeliveryPolicy = delivery_policy_helper_1.DeliveryPolicyHelper
            .verifyAndGetChannelDeliveryPolicy((_a = Attributes.entry.find(({ key }) => key === 'DeliveryPolicy')) === null || _a === void 0 ? void 0 : _a.value);
        const confirmed = ['sqs'].includes(protocol);
        return this._storageAdapter.createSubscription(user, topic, protocol, endPoint, Attributes, channelDeliveryPolicy, confirmed);
    }
    async findSubscription(topic, protocol, endPoint) {
        const [subscription] = await this._storageAdapter.findSubscriptions({ topicARN: topic.arn, protocol, endPoint }, 0, 1);
        return subscription;
    }
    createSubscriptionVerificationToken(subscription) {
        const token = `${encryption_1.Encryption.createHash('md5', (0, uuid_1.v4)())}${encryption_1.Encryption.createHash('md5', subscription.arn)}`;
        return this._storageAdapter.createSubscriptionVerificationToken(subscription, token);
    }
    async findSubscriptionVerificationToken(token) {
        const subscriptionVerificationToken = await this._storageAdapter.findSubscriptionVerificationTokenByToken(token);
        if (!subscriptionVerificationToken) {
            s_q_n_s_error_1.SQNSError.invalidToken();
        }
        return subscriptionVerificationToken;
    }
    async findSubscriptionFromArn(subscriptionArn) {
        const [subscription] = await this._storageAdapter.findSubscriptions({ arn: subscriptionArn }, 0, 1);
        if (!subscription) {
            s_q_n_s_error_1.SQNSError.invalidSubscription();
        }
        return subscription;
    }
    async confirmSubscription(subscription) {
        return this._storageAdapter.confirmSubscription(subscription);
    }
    async findPublish(id) {
        const [publish] = await this._storageAdapter.findPublishes({ id }, 0, 1);
        if (!publish) {
            s_q_n_s_error_1.SQNSError.invalidPublish();
        }
        return publish;
    }
    markPublished(publish) {
        return this._storageAdapter.markPublished(publish);
    }
    publish(topicArn, targetArn, Message, PhoneNumber, Subject, messageAttributes, messageStructure, MessageStructureFinal) {
        return this._storageAdapter.createPublish(topicArn, targetArn, Message, PhoneNumber, Subject, messageAttributes, messageStructure, MessageStructureFinal, publish_1.Publish.STATUS_PUBLISHING);
    }
    async findQueueByARN(queueARN) {
        const queue = await this._storageAdapter.getQueue(queueARN);
        if (!queue) {
            s_q_n_s_error_1.SQNSError.invalidQueueName(queueARN);
        }
        return queue;
    }
}
exports.SNSStorageEngine = SNSStorageEngine;
//# sourceMappingURL=s-n-s-storage-engine.js.map