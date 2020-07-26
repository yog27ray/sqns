"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = exports.StorageEngine = void 0;
const uuid_1 = require("uuid");
const index_1 = require("../../../index");
const aws_error_1 = require("../aws/aws-error");
const in_memory_adapter_1 = require("./in-memory/in-memory-adapter");
const mongo_d_b_adapter_1 = require("./mongodb/mongo-d-b-adapter");
var Database;
(function (Database) {
    Database[Database["IN_MEMORY"] = 0] = "IN_MEMORY";
    Database[Database["MONGO_DB"] = 1] = "MONGO_DB";
})(Database || (Database = {}));
exports.Database = Database;
class StorageEngine {
    constructor(database, config) {
        this.setDatabaseAdapter(database, config);
    }
    async addEventItem(queueName, eventItem_) {
        const eventItem = eventItem_;
        if (!eventItem.id) {
            eventItem.id = uuid_1.v4();
        }
        const queue = await this._storageAdapter.getQueue(queueName);
        const item = await this._storageAdapter.addEventItem(queue, eventItem);
        return new index_1.EventItem(item);
    }
    async getQueueNames() {
        const queues = await this._storageAdapter.getQueues();
        return queues.map((queue) => queue.name);
    }
    async findEventsToProcess(queueName, time) {
        const queue = await this._storageAdapter.getQueue(queueName);
        const items = await this._storageAdapter.findEventsToProcess(queue, time);
        return items.map((item) => new index_1.EventItem(item));
    }
    async updateEventStateProcessing(queue, eventItem_, visibilityTimeout, message) {
        const eventItem = eventItem_;
        eventItem.updateSentTime(new Date());
        eventItem.incrementReceiveCount();
        eventItem.eventTime = queue.calculateNewEventTime(new Date(), eventItem.receiveCount, visibilityTimeout);
        await this._storageAdapter.updateEvent(eventItem.id, {
            state: index_1.EventItem.State.PROCESSING.valueOf(),
            processingResponse: message,
            receiveCount: eventItem.receiveCount,
            firstSentTime: eventItem.firstSentTime,
            sentTime: eventItem.sentTime,
            eventTime: eventItem.eventTime,
        });
    }
    async updateEventState(queueName, id, state, message) {
        const queue = await this._storageAdapter.getQueue(queueName);
        const event = await this._storageAdapter.findById(id);
        if (!event || !queue || event.queueId !== queue.id) {
            return;
        }
        await this._storageAdapter.updateEvent(id, { ...message, state: state.valueOf() });
    }
    listQueues(queueNamePrefix) {
        return this._storageAdapter.getQueues(queueNamePrefix);
    }
    createQueue(queueName, attributes, tag) {
        return this._storageAdapter.createQueue(queueName, attributes, tag);
    }
    async getQueue(queueName) {
        const queue = await this._storageAdapter.getQueue(queueName);
        if (!queue) {
            aws_error_1.AwsError.invalidQueueName(queueName);
        }
        return queue;
    }
    async deleteQueue(queueName) {
        const queue = await this.getQueue(queueName);
        return this._storageAdapter.deleteQueue(queue);
    }
    setDatabaseAdapter(database, config) {
        switch (database) {
            case StorageEngine.Database.MONGO_DB: {
                this._storageAdapter = new mongo_d_b_adapter_1.MongoDBAdapter(config);
                break;
            }
            case Database.IN_MEMORY:
            default: {
                this._storageAdapter = new in_memory_adapter_1.InMemoryAdapter(config);
            }
        }
    }
    findEvent(id) {
        return this._storageAdapter.findById(id);
    }
}
exports.StorageEngine = StorageEngine;
StorageEngine.Database = Database;
//# sourceMappingURL=index.js.map