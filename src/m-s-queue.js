"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const event_manager_1 = require("./event-manager");
const inversify_1 = require("./inversify");
const master_1 = require("./routes/master");
const storage_1 = require("./storage");
class MSQueue {
    constructor({ requestTasks, database = storage_1.Database.IN_MEMORY, config = {} } = {}) {
        this.eventManager = inversify_1.container.get(event_manager_1.EventManager);
        this.eventManager.initialize(requestTasks);
        this.eventManager.setStorageEngine(database, config);
    }
    generateRoutes() {
        return master_1.generateRoutes(this.eventManager);
    }
    queueComparator(queueName, value) {
        this.eventManager.comparatorFunction(queueName, value);
    }
    resetAll() {
        this.eventManager.resetAll();
    }
}
exports.MSQueue = MSQueue;
MSQueue.Database = storage_1.Database;
//# sourceMappingURL=m-s-queue.js.map