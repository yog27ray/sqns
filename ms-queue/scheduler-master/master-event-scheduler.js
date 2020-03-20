"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("debug"));
const schedule = __importStar(require("node-schedule"));
const event_manager_1 = require("../event-manager");
const inversify_1 = require("../inversify");
const master_config_1 = require("./master-config");
const log = debug_1.default('ms-queue:EventScheduler');
class MasterEventScheduler {
    constructor(hostName, queueName, baseParams, listener, cronInterval) {
        this.hostName = hostName;
        this.queueName = queueName;
        this.config = inversify_1.container.get(master_config_1.MasterConfig);
        this.config.listener = listener;
        this.config.baseParams = baseParams;
        this.msQueueRequestHandler = new event_manager_1.MSQueueRequestHandler();
        this.initialize(cronInterval);
    }
    cancel() {
        this.job.cancel();
    }
    initialize(cronInterval = '* * * * *') {
        log('Adding scheduler job for event master.');
        this.job = schedule.scheduleJob(cronInterval, () => !this.config.sending && this.requestEventsToAddInQueue(this.cloneBaseParams));
    }
    get cloneBaseParams() {
        if (typeof this.config.baseParams === 'function') {
            return this.config.baseParams();
        }
        return JSON.parse(JSON.stringify(this.config.baseParams));
    }
    requestEventsToAddInQueue(itemListParams) {
        this.config.sending = true;
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(async () => {
            try {
                const [nextItemListParams, items] = await this.config.listener(itemListParams);
                if (!items.length) {
                    this.config.sending = false;
                    return;
                }
                await this.msQueueRequestHandler.addEventsToQueue(this.hostName, this.queueName, items);
                this.requestEventsToAddInQueue(nextItemListParams);
            }
            catch (error) {
                log(error);
                this.config.sending = false;
            }
        }, 0);
    }
}
exports.MasterEventScheduler = MasterEventScheduler;
//# sourceMappingURL=master-event-scheduler.js.map