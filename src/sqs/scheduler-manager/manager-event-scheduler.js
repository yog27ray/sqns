"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManagerEventScheduler = void 0;
const debug_1 = __importDefault(require("debug"));
const schedule = __importStar(require("node-schedule"));
const aws_1 = require("../aws");
const manager_config_1 = require("./manager-config");
const log = debug_1.default('ms-queue:EventScheduler');
class ManagerEventScheduler {
    constructor(options, queueName, baseParams, listener, cronInterval) {
        this.queueName = queueName;
        this.config = new manager_config_1.ManagerConfig();
        this.config.listener = listener;
        this.config.baseParams = baseParams;
        this.client = new aws_1.SimpleQueueServerClient(options);
        this.initialize(cronInterval);
    }
    cancel() {
        this.job.cancel();
    }
    async findOrCreateQueue() {
        if (this.queue) {
            return;
        }
        this.queue = await this.client.createQueue({ QueueName: this.queueName });
    }
    initialize(cronInterval = '* * * * *') {
        log('Adding scheduler job for event master.');
        this.job = schedule.scheduleJob(cronInterval, () => !this.config.sending && this.requestEventsToAddInQueue(this.cloneBaseParams));
    }
    get cloneBaseParams() {
        if (typeof this.config.baseParams === 'function') {
            const baseParamsFunction = this.config.baseParams;
            return baseParamsFunction();
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
                await this.addEventsToQueue(items);
                this.requestEventsToAddInQueue(nextItemListParams);
            }
            catch (error) {
                log(error);
                this.config.sending = false;
            }
        }, 0);
    }
    async addEventsToQueue(entries) {
        await this.findOrCreateQueue();
        await this.client.sendMessageBatch({
            QueueUrl: this.queue.QueueUrl,
            Entries: entries.map((entry, index) => ({
                Id: `${index + 1}`,
                MessageBody: entry.MessageBody,
                DelaySeconds: entry.DelaySeconds,
                MessageAttributes: entry.MessageAttributes,
                MessageSystemAttributes: entry.MessageSystemAttributes,
                MessageDeduplicationId: entry.MessageDeduplicationId,
                MessageGroupId: entry.MessageGroupId,
            })),
        });
    }
}
exports.ManagerEventScheduler = ManagerEventScheduler;
//# sourceMappingURL=manager-event-scheduler.js.map