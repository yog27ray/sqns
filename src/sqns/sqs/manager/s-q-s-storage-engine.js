"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQSStorageEngine = void 0;
const s_q_n_s_error_1 = require("../../common/auth/s-q-n-s-error");
const delivery_policy_helper_1 = require("../../common/helper/delivery-policy-helper");
const base_storage_engine_1 = require("../../common/model/base-storage-engine");
const event_item_1 = require("../../common/model/event-item");
class SQSStorageEngine extends base_storage_engine_1.BaseStorageEngine {
    addEventItem(queue, eventItem) {
        return this._storageAdapter.addEventItem(queue, eventItem);
    }
    findEventsToProcess(time, limit) {
        return this._storageAdapter.findEventsToProcess(time, limit);
    }
    async updateEventStateProcessing(queue, eventItem_, visibilityTimeout, message) {
        const eventItem = eventItem_;
        eventItem.updateSentTime(new Date());
        eventItem.incrementReceiveCount();
        const effectiveDeliveryPolicy = eventItem.DeliveryPolicy
            || queue.DeliveryPolicy
            || delivery_policy_helper_1.DeliveryPolicyHelper.DEFAULT_DELIVERY_POLICY.default.defaultHealthyRetryPolicy;
        eventItem.eventTime = delivery_policy_helper_1.DeliveryPolicyHelper.calculateNewEventTime(new Date(), effectiveDeliveryPolicy, { attempt: eventItem.receiveCount, minDelay: visibilityTimeout || effectiveDeliveryPolicy.minDelayTarget });
        await this._storageAdapter.updateEvent(eventItem.id, {
            state: event_item_1.EventItem.State.PROCESSING.valueOf(),
            processingResponse: message,
            receiveCount: eventItem.receiveCount,
            firstSentTime: eventItem.firstSentTime,
            sentTime: eventItem.sentTime,
            eventTime: eventItem.eventTime,
        });
    }
    async updateEvent(queue, eventItem) {
        const event = await this._storageAdapter.findById(eventItem.id);
        if (!event || !queue || event.queueARN !== queue.arn) {
            return;
        }
        await this._storageAdapter.updateEvent(eventItem.id, { ...eventItem.toJSON() });
    }
    async updateEventState(queue, id, state, message) {
        const event = await this._storageAdapter.findById(id);
        if (!event || !queue || event.queueARN !== queue.arn) {
            return;
        }
        await this._storageAdapter.updateEvent(id, { ...message, state: state.valueOf() });
    }
    listQueues(queueARNPrefix) {
        return this._storageAdapter.getQueues(queueARNPrefix);
    }
    createQueue(user, queueName, region, attributes, tag) {
        return this._storageAdapter.createQueue(user, queueName, region, attributes, tag);
    }
    async getQueue(queueARN) {
        const queue = await this._storageAdapter.getQueue(queueARN);
        if (!queue) {
            s_q_n_s_error_1.SQNSError.invalidQueueName(queueARN);
        }
        return queue;
    }
    async deleteQueue(queue) {
        return this._storageAdapter.deleteQueue(queue);
    }
    findEvent(id) {
        return this._storageAdapter.findById(id);
    }
    findQueueEvent(queue, messageId) {
        return this._storageAdapter.findByIdForQueue(queue, messageId);
    }
    findQueueEventByDeduplicationId(queue, messageDeduplicationId) {
        return this._storageAdapter.findByDeduplicationIdForQueue(queue, messageDeduplicationId);
    }
}
exports.SQSStorageEngine = SQSStorageEngine;
//# sourceMappingURL=s-q-s-storage-engine.js.map