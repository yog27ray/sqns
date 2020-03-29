"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const event_manager_1 = require("./event-manager");
const inversify_1 = require("./inversify");
const master_1 = require("./routes/master");
class MSQueue {
    constructor({ requestTasks } = {}) {
        this.eventManager = inversify_1.container.get(event_manager_1.EventManager);
        this.eventManager.initialize(requestTasks);
    }
    generateRoutes() {
        return master_1.router;
    }
    queueComparator(queueName, value) {
        this.eventManager.comparatorFunction(queueName, value);
    }
}
exports.MSQueue = MSQueue;
//# sourceMappingURL=m-s-queue.js.map