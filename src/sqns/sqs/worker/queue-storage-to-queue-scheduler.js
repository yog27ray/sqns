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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueStorageToQueueScheduler = void 0;
const schedule = __importStar(require("node-schedule"));
const logger_1 = require("../../common/logger/logger");
const queue_storage_to_queue_config_1 = require("./queue-storage-to-queue-config");
const log = logger_1.logger.instance('QueueStorageToQueueScheduler');
class QueueStorageToQueueScheduler {
    constructor(queue, baseParams, listener, cronInterval) {
        this.config = new queue_storage_to_queue_config_1.QueueStorageToQueueConfig();
        this.config.listener = listener;
        this.config.queues = [queue];
        this.config.baseParams = baseParams;
        log.info(`Adding scheduler job for queueARN: ${queue.arn}`);
        this._job = schedule.scheduleJob(cronInterval || '*/5 * * * * *', () => this.startProcessingOfQueue());
    }
    cancel() {
        this._job.cancel();
    }
    addQueue(queue) {
        log.info(`Adding queueARN: ${queue.arn}`);
        this.config.queues.push(queue);
    }
    startProcessingOfQueue() {
        if (this.config.sending) {
            return;
        }
        this.findEventsToAddInQueueAsynchronous(this.config.queues.map((each) => each), this.config.cloneBaseParams);
    }
    findEventsToAddInQueueAsynchronous(queues, itemListParams) {
        this.config.sending = true;
        this.findEventsToAddInQueue(queues, itemListParams)
            .catch((error) => {
            log.error(error);
            this.config.sending = false;
        });
    }
    async findEventsToAddInQueue(queues, itemListParams) {
        const [nextItemListParams, hasMoreData] = await this.config.listener(queues, itemListParams);
        if (!hasMoreData) {
            this.config.sending = false;
            return;
        }
        this.findEventsToAddInQueueAsynchronous(queues, nextItemListParams);
    }
}
exports.QueueStorageToQueueScheduler = QueueStorageToQueueScheduler;
//# sourceMappingURL=queue-storage-to-queue-scheduler.js.map