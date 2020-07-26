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
exports.QueueStorageToQueueScheduler = void 0;
const debug_1 = __importDefault(require("debug"));
const schedule = __importStar(require("node-schedule"));
const queue_storage_to_queue_config_1 = require("./queue-storage-to-queue-config");
const log = debug_1.default('ms-queue:QueueStorageToQueueScheduler');
class QueueStorageToQueueScheduler {
    constructor(queueName, baseParams, listener, cronInterval = '*/5 * * * * *') {
        this.config = new queue_storage_to_queue_config_1.QueueStorageToQueueConfig();
        this.config.listener = listener;
        this.config.queueName = queueName;
        this.config.baseParams = baseParams;
        log(`Adding scheduler job for queueName: ${queueName}`);
        this._job = schedule.scheduleJob(cronInterval, () => this.startProcessingOfQueue());
    }
    cancel() {
        this._job.cancel();
    }
    startProcessingOfQueue() {
        if (this.config.sending) {
            return;
        }
        this.findEventsToAddInQueue(this.cloneBaseParams);
    }
    get cloneBaseParams() {
        if (typeof this.config.baseParams === 'function') {
            return this.config.baseParams();
        }
        return JSON.parse(JSON.stringify(this.config.baseParams));
    }
    findEventsToAddInQueue(itemListParams) {
        this.config.sending = true;
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(async () => {
            try {
                const [nextItemListParams, hasMoreData] = await this.config.listener(this.config.queueName, itemListParams);
                if (!hasMoreData) {
                    this.config.sending = false;
                    return;
                }
                this.findEventsToAddInQueue(nextItemListParams);
            }
            catch (error) {
                log(error);
                this.config.sending = false;
            }
        }, 0);
    }
}
exports.QueueStorageToQueueScheduler = QueueStorageToQueueScheduler;
//# sourceMappingURL=queue-storage-to-queue-scheduler.js.map