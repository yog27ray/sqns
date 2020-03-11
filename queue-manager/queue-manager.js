"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("debug"));
const event_manager_1 = require("./event-manager");
const master_1 = require("./routes/master");
const slave_1 = require("./routes/slave");
const inversify_1 = require("./inversify");
const queue_manager_config_1 = require("./event-manager/queue-manager-config");
const log = debug_1.default('queue-manager:QueueManager');
class QueueManager {
    constructor({ isMaster, masterURL }) {
        this.isMaster = isMaster;
        const eventManager = inversify_1.container.get(event_manager_1.EventManager);
        const queueManagerConfig = inversify_1.container.get(queue_manager_config_1.QueueManagerConfig);
        queueManagerConfig.masterURL = masterURL;
        if (isMaster) {
            eventManager.initialize();
        }
    }
    generateRoutes() {
        return this.isMaster ? master_1.router : slave_1.router;
    }
}
exports.QueueManager = QueueManager;
//# sourceMappingURL=queue-manager.js.map