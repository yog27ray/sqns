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
const request_promise_1 = __importDefault(require("request-promise"));
const schedule = __importStar(require("node-schedule"));
const master_config_1 = require("./master-config");
const inversify_1 = require("../inversify");
const log = debug_1.default('ms-queue:EventScheduler');
class MasterEventScheduler {
    constructor(hostName, queueName, baseParams, listener, cronInterval) {
        this.hostName = hostName;
        this.queueName = queueName;
        this.config = inversify_1.container.get(master_config_1.MasterConfig);
        this.config.listener = listener;
        this.config.baseParams = baseParams;
        this.initialize(cronInterval);
    }
    initialize(cronInterval = '* * * * *') {
        log('Adding scheduler job for event master.');
        this.job = schedule.scheduleJob(cronInterval, () => !this.config.sending && this.requestEventsToAddInQueue(this.cloneBaseParams));
    }
    get cloneBaseParams() {
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
                await request_promise_1.default({
                    method: 'POST',
                    uri: `${this.hostName}/queue/${this.queueName}/event/bulk/new`,
                    body: items.map((item) => item.toRequestBody()),
                    json: true,
                });
                this.requestEventsToAddInQueue(nextItemListParams);
            }
            catch (error) {
                log(error);
                this.config.sending = false;
            }
        }, 0);
    }
    cancel() {
        this.job.cancel();
    }
}
exports.MasterEventScheduler = MasterEventScheduler;
//# sourceMappingURL=master-event-scheduler.js.map