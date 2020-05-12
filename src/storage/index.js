"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../index");
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
    async addEventItem(queueName, eventItem) {
        const item = await this._storageAdapter.addEventItem(queueName, eventItem.toJSON());
        return new index_1.EventItem(item);
    }
    async getQueueNames() {
        return this._storageAdapter.getQueueNames();
    }
    async findEventsToProcess(queueName, time) {
        const items = await this._storageAdapter.findEventsToProcess(queueName, time);
        return items.map((item) => new index_1.EventItem(item));
    }
    async updateEventStateProcessing(queueName, id, message) {
        await this._storageAdapter.updateEvent(queueName, id, { state: index_1.EventItem.State.PROCESSING.valueOf(), processingResponse: { message } });
    }
    async updateEventStateSuccess(queueName, id, successResponse) {
        await this._storageAdapter.updateEvent(queueName, id, { state: index_1.EventItem.State.SUCCESS.valueOf(), successResponse });
    }
    async updateEventStateFailure(queueName, id, failureResponse) {
        await this._storageAdapter.updateEvent(queueName, id, { state: index_1.EventItem.State.FAILURE.valueOf(), failureResponse });
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
}
exports.StorageEngine = StorageEngine;
StorageEngine.Database = Database;
//# sourceMappingURL=index.js.map