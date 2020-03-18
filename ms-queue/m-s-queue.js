"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const event_manager_1 = require("./event-manager");
const inversify_1 = require("./inversify");
const master_1 = require("./routes/master");
const slave_1 = require("./routes/slave");
class MSQueue {
    constructor({ isMaster }) {
        this.isMaster = isMaster;
        const eventManager = inversify_1.container.get(event_manager_1.EventManager);
        if (isMaster) {
            eventManager.initialize();
        }
    }
    generateRoutes() {
        return this.isMaster ? master_1.router : slave_1.router;
    }
}
exports.MSQueue = MSQueue;
//# sourceMappingURL=m-s-queue.js.map