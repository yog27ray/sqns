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
exports.WorkerEventScheduler = void 0;
const debug_1 = __importDefault(require("debug"));
const schedule = __importStar(require("node-schedule"));
const aws_1 = require("../aws");
const worker_config_1 = require("./worker-config");
const log = debug_1.default('ms-queue:EventScheduler');
class WorkerEventScheduler {
    constructor(options, queueName, listener, cronInterval) {
        this.Config = { MAX_COUNT: 1 };
        this.queueName = queueName;
        this.config = new worker_config_1.WorkerConfig();
        this.config.listener = listener;
        this.client = new aws_1.SimpleQueueServerClient(options);
        this.initialize(cronInterval);
        this.setParallelProcessingCount(1);
    }
    setParallelProcessingCount(count) {
        this.Config.MAX_COUNT = count;
    }
    cancel() {
        this.job.cancel();
    }
    initialize(cronInterval = '15 * * * * *') {
        log('Adding scheduler job for event slave.');
        this.job = schedule.scheduleJob(cronInterval, () => !this.config.polling && this.checkIfMoreItemsCanBeProcessed());
    }
    checkIfMoreItemsCanBeProcessed() {
        this.config.polling = true;
        if (this.config.config.count >= this.Config.MAX_COUNT) {
            return;
        }
        while (this.config.config.count < this.Config.MAX_COUNT && this.config.hasMore) {
            this.requestEventToProcess();
        }
        if (!this.config.config.count && !this.config.hasMore) {
            this.config.polling = false;
            this.config.hasMore = true;
        }
    }
    async findOrCreateQueue() {
        if (this.queue) {
            return;
        }
        this.queue = await this.client.createQueue({ QueueName: this.queueName });
    }
    requestEventToProcess() {
        this.config.config.count += 1;
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(async () => {
            try {
                await this.findOrCreateQueue();
                const result = await this.client
                    .receiveMessage({ QueueUrl: this.queue.QueueUrl, MessageAttributeNames: ['ALL'] });
                const { Messages: [eventItem] } = result;
                if (!eventItem) {
                    this.config.hasMore = false;
                }
                else {
                    const [isSuccess, response] = await this.processEvent(eventItem);
                    if (isSuccess) {
                        await this.client.markEventSuccess(eventItem.MessageId, this.queue.QueueUrl, response);
                    }
                    else {
                        await this.client.markEventFailure(eventItem.MessageId, this.queue.QueueUrl, response);
                    }
                }
            }
            catch (error) {
                log(error);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
                if (!error.code && error.message && error.message.startsWith('Error: connect ECONNREFUSED')) {
                    this.config.hasMore = false;
                }
            }
            this.config.config.count -= 1;
            this.checkIfMoreItemsCanBeProcessed();
        }, 0);
    }
    async processEvent(responseItem) {
        try {
            const response = await this.config.listener(responseItem);
            return [true, response];
        }
        catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            return [false, error.message];
        }
    }
}
exports.WorkerEventScheduler = WorkerEventScheduler;
//# sourceMappingURL=worker-event-scheduler.js.map