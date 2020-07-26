"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventItem = exports.EventManager = void 0;
const debug_1 = __importDefault(require("debug"));
const request_promise_1 = __importDefault(require("request-promise"));
const storage_1 = require("../storage");
const storage_to_queue_worker_1 = require("../worker/storage-to-queue-worker");
const event_item_1 = require("./event-item");
Object.defineProperty(exports, "EventItem", { enumerable: true, get: function () { return event_item_1.EventItem; } });
const event_queue_1 = require("./event-queue");
const log = debug_1.default('ms-queue:EventManager');
class EventManager {
    constructor() {
        this.addEventInQueueListener = (queueName, item) => {
            this.addItemInQueue(queueName, item);
        };
        this._eventQueue = new event_queue_1.EventQueue();
    }
    get eventStats() {
        const priorityStats = JSON.parse(JSON.stringify(EventManager.DEFAULT_PRIORITIES));
        const queueNames = this._eventQueue.queueNames();
        queueNames.forEach((queueName) => {
            Object.values(this._eventQueue.eventIds(queueName)).forEach((event) => {
                if (!priorityStats[queueName]) {
                    priorityStats[queueName] = { PRIORITY_TOTAL: 0 };
                }
                const statKey = `PRIORITY_${event.priority}`;
                EventManager.DEFAULT_PRIORITIES[statKey] = 0;
                if (!EventManager.DEFAULT_PRIORITIES[queueName]) {
                    EventManager.DEFAULT_PRIORITIES[queueName] = { PRIORITY_TOTAL: 0 };
                }
                EventManager.DEFAULT_PRIORITIES[queueName][statKey] = 0;
                // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
                priorityStats[queueName][statKey] = (priorityStats[queueName][statKey] || 0) + 1;
                priorityStats[queueName].PRIORITY_TOTAL += 1;
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
        Object.keys(priorityStats).forEach((queueName) => {
            if (typeof priorityStats[queueName] === 'object') {
                const priorityStatsQueueName = priorityStats[queueName];
                Object.keys(priorityStatsQueueName).forEach((key) => {
                    prometheusRows.push(`${queueName}_queue_priority{label="${key}"} ${priorityStatsQueueName[key]} ${unixTimeStamp}`);
                });
                return;
            }
            prometheusRows.push(`queue_priority{label="${queueName}"} ${priorityStats[queueName]} ${unixTimeStamp}`);
        });
        return `${prometheusRows.sort().join('\n')}\n`;
    }
    setStorageEngine(database, config, cronInterval) {
        this._storageEngine = new storage_1.StorageEngine(database, config);
        this.storageToQueueWorker = new storage_to_queue_worker_1.StorageToQueueWorker(this._storageEngine, this.addEventInQueueListener, cronInterval);
    }
    initialize(notifyNeedTaskURLS = []) {
        this._eventQueue.notifyNeedTaskURLS = notifyNeedTaskURLS;
    }
    comparatorFunction(queueName, value) {
        this._eventQueue.comparatorFunction(queueName, value);
    }
    async poll(queue, visibilityTimeout) {
        if (!this._eventQueue.size(queue.name)) {
            await Promise.all(this._eventQueue.notifyNeedTaskURLS
                .map(async (url) => {
                await request_promise_1.default({ uri: url, method: 'POST', body: { queueName: queue.name }, json: true });
            }))
                .catch((error) => log(error));
            return undefined;
        }
        const eventItem = this._eventQueue.pop(queue.name);
        await this._storageEngine.updateEventStateProcessing(queue, eventItem, visibilityTimeout, 'sent to slave');
        if (eventItem.eventTime.getTime() <= new Date().getTime()) {
            const event = await this._storageEngine.findEvent(eventItem.id);
            if (event && event.receiveCount < event.maxReceiveCount) {
                this.addItemInQueue(queue.name, event);
            }
        }
        return eventItem;
    }
    resetAll(resetOnlyStatistics) {
        EventManager.DEFAULT_PRIORITIES = { PRIORITY_TOTAL: 0 };
        if (resetOnlyStatistics) {
            return;
        }
        this._eventQueue.resetAll();
    }
    async updateEventStateSuccess(queueName, id, message) {
        await this._storageEngine.updateEventState(queueName, id, event_item_1.EventItem.State.SUCCESS, { successResponse: message });
    }
    async updateEventStateFailure(queueName, id, message) {
        await this._storageEngine.updateEventState(queueName, id, event_item_1.EventItem.State.FAILURE, { failureResponse: message });
    }
    listQueues(queueNamePrefix) {
        return this._storageEngine.listQueues(queueNamePrefix);
    }
    createQueue(queueName, attributes, tag) {
        return this._storageEngine.createQueue(queueName, attributes, tag);
    }
    getQueue(queueName) {
        return this._storageEngine.getQueue(queueName);
    }
    async deleteQueue(queueName) {
        await this._storageEngine.deleteQueue(queueName);
        this._eventQueue.reset(queueName);
        delete EventManager.DEFAULT_PRIORITIES[queueName];
        if (Object.keys(EventManager.DEFAULT_PRIORITIES).every((key) => key.startsWith('PRIORITY_'))) {
            EventManager.DEFAULT_PRIORITIES = { PRIORITY_TOTAL: 0 };
        }
    }
    async sendMessage(queueName, MessageBody, MessageAttribute, MessageSystemAttribute, DelaySeconds = '0', MessageDeduplicationId) {
        this.storageToQueueWorker.setUpIntervalForQueue(queueName);
        const queue = await this._storageEngine.getQueue(queueName);
        const eventItem = new event_item_1.EventItem({
            MessageAttribute,
            MessageSystemAttribute,
            MessageBody,
            queueId: queue.id,
            MessageDeduplicationId,
            maxReceiveCount: queue.getMaxReceiveCount(),
            eventTime: new Date(new Date().getTime() + (Number(DelaySeconds) * 1000)),
        });
        const inQueueEvent = this._eventQueue.findEventInQueue(queueName, eventItem);
        if (inQueueEvent) {
            return inQueueEvent;
        }
        const insertedEventItem = await this._storageEngine.addEventItem(queueName, eventItem);
        if (insertedEventItem.eventTime.getTime() <= new Date().getTime()) {
            this.addItemInQueue(queueName, insertedEventItem);
            await this._storageEngine.findEvent(insertedEventItem.id);
        }
        this.addToPriorities(queueName, insertedEventItem.priority);
        return insertedEventItem;
    }
    receiveMessage(queue, VisibilityTimeout = '30', MaxNumberOfMessages = '1') {
        return this.pollN(queue, Number(VisibilityTimeout), Number(MaxNumberOfMessages));
    }
    cancel() {
        this.storageToQueueWorker.cancel();
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
    addItemInQueue(queueName, eventItem) {
        if (this._eventQueue.isEventPresent(queueName, eventItem)) {
            return;
        }
        this._eventQueue.add(queueName, eventItem);
    }
    addToPriorities(queueName, priority) {
        const statKey = `PRIORITY_${priority}`;
        if (isNaN(EventManager.DEFAULT_PRIORITIES[statKey])) {
            EventManager.DEFAULT_PRIORITIES[statKey] = 0;
        }
        if (!EventManager.DEFAULT_PRIORITIES[queueName]) {
            EventManager.DEFAULT_PRIORITIES[queueName] = { PRIORITY_TOTAL: 0 };
        }
        if (isNaN(EventManager.DEFAULT_PRIORITIES[queueName][statKey])) {
            EventManager.DEFAULT_PRIORITIES[queueName][statKey] = 0;
        }
    }
}
exports.EventManager = EventManager;
EventManager.Database = storage_1.Database;
EventManager.DEFAULT_PRIORITIES = { PRIORITY_TOTAL: 0 };
//# sourceMappingURL=event-manager.js.map