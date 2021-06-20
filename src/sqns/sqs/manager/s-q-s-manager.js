"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQSManager = void 0;
const delivery_policy_helper_1 = require("../../common/helper/delivery-policy-helper");
const logger_1 = require("../../common/logger/logger");
const base_manager_1 = require("../../common/model/base-manager");
const event_item_1 = require("../../common/model/event-item");
const request_client_1 = require("../../common/request-client/request-client");
const storage_to_queue_worker_1 = require("../worker/storage-to-queue-worker");
const s_q_s_queue_1 = require("./s-q-s-queue");
const s_q_s_storage_engine_1 = require("./s-q-s-storage-engine");
const log = logger_1.logger.instance('EventManager');
class SQSManager extends base_manager_1.BaseManager {
    constructor(sqsConfig) {
        super();
        this.requestClient = new request_client_1.RequestClient();
        this.addEventInQueueListener = (item) => {
            this.addItemInQueue(item);
        };
        this._eventQueue = new s_q_s_queue_1.SQSQueue();
        this._eventQueue.notifyNeedTaskURLS = sqsConfig.requestTasks || [];
        this._sQSStorageEngine = new s_q_s_storage_engine_1.SQSStorageEngine(sqsConfig.db);
        this.storageToQueueWorker = new storage_to_queue_worker_1.StorageToQueueWorker(this._sQSStorageEngine, this.addEventInQueueListener, sqsConfig.cronInterval);
    }
    static addToPriorities(queueARN, priority) {
        const statKey = `PRIORITY_${priority}`;
        if (isNaN(SQSManager.DEFAULT_PRIORITIES[statKey])) {
            SQSManager.DEFAULT_PRIORITIES[statKey] = 0;
        }
        if (!SQSManager.DEFAULT_PRIORITIES[queueARN]) {
            SQSManager.DEFAULT_PRIORITIES[queueARN] = { PRIORITY_TOTAL: 0 };
        }
        if (isNaN(SQSManager.DEFAULT_PRIORITIES[queueARN][statKey])) {
            SQSManager.DEFAULT_PRIORITIES[queueARN][statKey] = 0;
        }
    }
    static prometheusARN(queueARN) {
        return queueARN.replace(new RegExp(':', 'g'), '_');
    }
    get eventStats() {
        const priorityStats = JSON.parse(JSON.stringify(SQSManager.DEFAULT_PRIORITIES));
        const queueARNs = this._eventQueue.queueARNs();
        queueARNs.forEach((queueARN) => {
            Object.values(this._eventQueue.eventIds(queueARN)).forEach((event) => {
                if (!priorityStats[queueARN]) {
                    priorityStats[queueARN] = { PRIORITY_TOTAL: 0 };
                }
                const statKey = `PRIORITY_${event.priority}`;
                SQSManager.DEFAULT_PRIORITIES[statKey] = 0;
                if (!SQSManager.DEFAULT_PRIORITIES[queueARN]) {
                    SQSManager.DEFAULT_PRIORITIES[queueARN] = { PRIORITY_TOTAL: 0 };
                }
                SQSManager.DEFAULT_PRIORITIES[queueARN][statKey] = 0;
                // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
                priorityStats[queueARN][statKey] = (priorityStats[queueARN][statKey] || 0) + 1;
                priorityStats[queueARN].PRIORITY_TOTAL += 1;
                // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
                priorityStats[statKey] = (priorityStats[statKey] || 0) + 1;
                priorityStats.PRIORITY_TOTAL += 1;
            });
        });
        return priorityStats;
    }
    prometheus(time = new Date()) {
        const unixTimeStamp = time.getTime();
        const prometheusRows = [];
        const priorityStats = this.eventStats;
        Object.keys(priorityStats).forEach((queueARN) => {
            if (typeof priorityStats[queueARN] === 'object') {
                const priorityStatsQueueARN = priorityStats[queueARN];
                Object.keys(priorityStatsQueueARN).forEach((key) => {
                    prometheusRows.push(`${SQSManager.prometheusARN(queueARN)}_queue_priority{label="${key}"} ${priorityStatsQueueARN[key]} ${unixTimeStamp}`);
                });
                return;
            }
            prometheusRows.push(`queue_priority{label="${SQSManager.prometheusARN(queueARN)}"} ${priorityStats[queueARN]} ${unixTimeStamp}`);
        });
        return `${prometheusRows.sort().join('\n')}\n`;
    }
    comparatorFunction(queueARN, value) {
        this._eventQueue.comparatorFunction(queueARN, value);
    }
    async poll(queue, visibilityTimeout) {
        if (!this._eventQueue.size(queue.arn)) {
            await Promise.all(this._eventQueue.notifyNeedTaskURLS
                .map((url) => this.requestClient.post(url, { body: JSON.stringify({ arn: queue.arn }), json: true })))
                .catch((error) => {
                log.error(error);
            });
            return undefined;
        }
        const eventItem = this._eventQueue.pop(queue.arn);
        await this._sQSStorageEngine.updateEventStateProcessing(queue, eventItem, visibilityTimeout, 'sent to slave');
        if (eventItem.eventTime.getTime() <= new Date().getTime()) {
            const event = await this._sQSStorageEngine.findEvent(eventItem.id);
            if (event && event.receiveCount < event.maxReceiveCount) {
                this.addItemInQueue(event);
            }
        }
        return eventItem;
    }
    resetAll(resetOnlyStatistics) {
        SQSManager.DEFAULT_PRIORITIES = { PRIORITY_TOTAL: 0 };
        if (resetOnlyStatistics) {
            return;
        }
        this._eventQueue.resetAll();
    }
    async updateEvent(queue, event) {
        await this._sQSStorageEngine.updateEvent(queue, event);
    }
    updateEventStateSuccess(queue, id, message) {
        return this._sQSStorageEngine.updateEventState(queue, id, event_item_1.EventItem.State.SUCCESS, { successResponse: message });
    }
    async updateEventStateFailure(queue, id, message) {
        await this._sQSStorageEngine.updateEventState(queue, id, event_item_1.EventItem.State.FAILURE, { failureResponse: message });
    }
    listQueues(queueARNPrefix) {
        return this._sQSStorageEngine.listQueues(queueARNPrefix);
    }
    createQueue(user, queueName, region, attributes, tag) {
        return this._sQSStorageEngine.createQueue(user, queueName, region, attributes, tag);
    }
    getQueue(queueARN) {
        return this._sQSStorageEngine.getQueue(queueARN);
    }
    async deleteQueue(queue) {
        await this._sQSStorageEngine.deleteQueue(queue);
        this._eventQueue.reset(queue.arn);
        delete SQSManager.DEFAULT_PRIORITIES[queue.arn];
        if (Object.keys(SQSManager.DEFAULT_PRIORITIES).every((key) => key.startsWith('PRIORITY_'))) {
            SQSManager.DEFAULT_PRIORITIES = { PRIORITY_TOTAL: 0 };
        }
    }
    async sendMessage(queue, MessageBody, MessageAttribute, MessageSystemAttribute, DelaySeconds = '0', MessageDeduplicationId) {
        var _a;
        this.storageToQueueWorker.setUpIntervalForQueue(queue);
        const DeliveryPolicy = delivery_policy_helper_1.DeliveryPolicyHelper
            .verifyAndGetChannelDeliveryPolicy((_a = MessageAttribute === null || MessageAttribute === void 0 ? void 0 : MessageAttribute.DeliveryPolicy) === null || _a === void 0 ? void 0 : _a.StringValue, true) || queue.DeliveryPolicy;
        const eventItem = new event_item_1.EventItem({
            id: undefined,
            MessageAttribute,
            MessageSystemAttribute,
            MessageBody,
            queueARN: queue.arn,
            DeliveryPolicy,
            MessageDeduplicationId,
            maxReceiveCount: queue.getMaxReceiveCount(),
            eventTime: new Date(new Date().getTime() + (Number(DelaySeconds) * 1000)),
        });
        const inQueueEvent = this._eventQueue.findEventInQueue(queue.arn, eventItem);
        if (inQueueEvent) {
            return inQueueEvent;
        }
        const insertedEventItem = await this._sQSStorageEngine.addEventItem(queue, eventItem);
        if (insertedEventItem.eventTime.getTime() <= new Date().getTime()) {
            this.addItemInQueue(insertedEventItem);
            await this._sQSStorageEngine.findEvent(insertedEventItem.id);
        }
        SQSManager.addToPriorities(queue.arn, insertedEventItem.priority);
        return insertedEventItem;
    }
    receiveMessage(queue, VisibilityTimeout = '30', MaxNumberOfMessages = '1') {
        return this.pollN(queue, Number(VisibilityTimeout), Number(MaxNumberOfMessages));
    }
    cancel() {
        this.storageToQueueWorker.cancel();
    }
    getStorageEngine() {
        return this._sQSStorageEngine;
    }
    async findMessageById(queue, messageId) {
        return this._sQSStorageEngine.findQueueEvent(queue, messageId);
    }
    async pollN(queue, visibilityTimeout, size) {
        if (!size) {
            return [];
        }
        const response = await this.poll(queue, visibilityTimeout);
        if (!response) {
            return [];
        }
        const responses = await this.pollN(queue, visibilityTimeout, size - 1);
        responses.unshift(response);
        return responses;
    }
    addItemInQueue(eventItem) {
        if (this._eventQueue.isEventPresent(eventItem)) {
            return;
        }
        this._eventQueue.add(eventItem);
    }
}
exports.SQSManager = SQSManager;
SQSManager.DEFAULT_PRIORITIES = { PRIORITY_TOTAL: 0 };
//# sourceMappingURL=s-q-s-manager.js.map