"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleQueueServer = void 0;
const event_manager_1 = require("./event-manager");
const master_1 = require("./routes/master");
const storage_1 = require("./storage");
class SimpleQueueServer {
    constructor({ requestTasks, database = storage_1.Database.IN_MEMORY, config, cronInterval }) {
        this.eventManager = new event_manager_1.EventManager();
        this.eventManager.initialize(requestTasks);
        this.eventManager.setStorageEngine(database, config, cronInterval);
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
    cancel() {
        this.eventManager.cancel();
    }
}
exports.SimpleQueueServer = SimpleQueueServer;
SimpleQueueServer.Database = storage_1.Database;
//# sourceMappingURL=simple-queue-server.js.map