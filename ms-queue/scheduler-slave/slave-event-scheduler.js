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
const slave_config_1 = require("./slave-config");
const log = debug_1.default('ms-queue:EventScheduler');
class SlaveEventScheduler {
    constructor(hostName, queueName, listener, cronInterval) {
        this.hostName = hostName;
        this.queueName = queueName;
        this.config = inversify_1.container.get(slave_config_1.SlaveConfig);
        this.config.listener = listener;
        this.msQueueRequestHandler = new event_manager_1.MSQueueRequestHandler();
        this.initialize(cronInterval);
    }
    cancel() {
        this.job.cancel();
    }
    initialize(cronInterval = '15 * * * * *') {
        log('Adding scheduler job for event slave.');
        this.job = schedule.scheduleJob(cronInterval, () => this.checkIfMoreItemsCanBeProcessed());
    }
    checkIfMoreItemsCanBeProcessed() {
        this.config.polling = true;
        if (this.config.config.count >= SlaveEventScheduler.Config.MAX_COUNT) {
            return;
        }
        while (this.config.config.count < SlaveEventScheduler.Config.MAX_COUNT && this.config.hasMore) {
            this.requestEventToProcess();
        }
        if (!this.config.config.count && !this.config.hasMore) {
            this.config.polling = false;
        }
    }
    requestEventToProcess() {
        this.config.config.count += 1;
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(async () => {
            try {
                const eventItem = await this.msQueueRequestHandler.fetchEventsFromQueue(this.hostName, this.queueName);
                if (!eventItem) {
                    this.config.hasMore = false;
                }
                else {
                    await this.config.listener(eventItem);
                }
            }
            catch (error) {
                log(error);
                if (!error.code && error.message.startsWith('Error: connect ECONNREFUSED')) {
                    this.config.hasMore = false;
                }
            }
            this.config.config.count -= 1;
            this.checkIfMoreItemsCanBeProcessed();
        }, 0);
    }
}
exports.SlaveEventScheduler = SlaveEventScheduler;
SlaveEventScheduler.Config = { MAX_COUNT: 1 };
//# sourceMappingURL=slave-event-scheduler.js.map