"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageToQueueWorker = void 0;
const logger_1 = require("../../common/logger/logger");
const queue_storage_to_queue_scheduler_1 = require("./queue-storage-to-queue-scheduler");
const log = logger_1.logger.instance('StorageToQueueWorker');
class StorageToQueueWorker {
    constructor(storageEngine, addEventToQueueListener, cronInterval) {
        this._storageEngine = storageEngine;
        this._addEventToQueueListener = addEventToQueueListener;
        this.cronInterval = cronInterval;
        this.setUpListener();
        this.setUpInterval().catch((error) => {
            log.error(error);
        });
    }
    setUpIntervalForQueue(queue) {
        if (!this._queueStorageToQueueScheduler) {
            this._queueStorageToQueueScheduler = new queue_storage_to_queue_scheduler_1.QueueStorageToQueueScheduler(queue, this.baseParams(), this._listener, this.cronInterval);
        }
        else {
            this._queueStorageToQueueScheduler.addQueue(queue);
        }
    }
    cancel() {
        this._queueStorageToQueueScheduler.cancel();
        this._queueStorageToQueueScheduler = undefined;
    }
    async setUpInterval() {
        const queues = await this._storageEngine.listQueues(undefined);
        queues.forEach((queue) => this.setUpIntervalForQueue(queue));
    }
    baseParams() {
        return () => ({ time: new Date() });
    }
    setUpListener() {
        this._listener = async (queues, { time }) => {
            const items = await this._storageEngine.findEventsToProcess(queues, time, 20);
            if (!items.length) {
                return [{}, false];
            }
            items.forEach((item) => this._addEventToQueueListener(item));
            return [{ time: items[items.length - 1].eventTime }, true];
        };
    }
}
exports.StorageToQueueWorker = StorageToQueueWorker;
//# sourceMappingURL=storage-to-queue-worker.js.map