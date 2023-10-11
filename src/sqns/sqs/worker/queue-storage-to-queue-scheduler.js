"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
    constructor(baseParams, listener, cronInterval) {
        this.config = new queue_storage_to_queue_config_1.QueueStorageToQueueConfig();
        this.config.listener = listener;
        this.config.baseParams = baseParams;
        log.info('Adding scheduler job');
        this._job = schedule.scheduleJob(cronInterval || '*/5 * * * * *', () => {
            log.info('Executing Manage Job Interval');
            this.startProcessingOfQueue();
        });
    }
    cancel() {
        this._job.cancel();
    }
    startProcessingOfQueue() {
        if (this.config.sending) {
            log.verbose('already fetching events.');
            return;
        }
        log.info('start fetching events.');
        this.findEventsToAddInQueueAsynchronous(this.config.cloneBaseParams);
    }
    findEventsToAddInQueueAsynchronous(itemListParams) {
        this.config.sending = true;
        this.findEventsToAddInQueue(itemListParams)
            .catch((error) => {
            log.error(error);
            this.config.sending = false;
        });
    }
    async findEventsToAddInQueue(itemListParams) {
        const [nextItemListParams, hasMoreData] = await this.config.listener(itemListParams);
        if (!hasMoreData) {
            log.info('No more data to fetch, resetting.');
            this.config.sending = false;
            return;
        }
        this.findEventsToAddInQueueAsynchronous(nextItemListParams);
    }
}
exports.QueueStorageToQueueScheduler = QueueStorageToQueueScheduler;
//# sourceMappingURL=queue-storage-to-queue-scheduler.js.map