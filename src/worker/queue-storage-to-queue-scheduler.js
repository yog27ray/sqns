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
    startProcessingOfQueue() {
        if (this.config.sending) {
            return;
        }
        this.findEventsToAddInQueue(this.cloneBaseParams);
    }
    cancel() {
        this._job.cancel();
    }
    get cloneBaseParams() {
        return this.config.baseParams();
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