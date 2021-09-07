"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageToQueueWorker = void 0;
const queue_storage_to_queue_scheduler_1 = require("./queue-storage-to-queue-scheduler");
class StorageToQueueWorker {
    constructor(storageEngine, addEventToQueueListener, cronInterval) {
        this._storageEngine = storageEngine;
        this._addEventToQueueListener = addEventToQueueListener;
        this.cronInterval = cronInterval;
        this.setUpListener();
        this.setUpIntervalForQueue();
    }
    setUpIntervalForQueue() {
        this._queueStorageToQueueScheduler = new queue_storage_to_queue_scheduler_1.QueueStorageToQueueScheduler(this.baseParams(), this._listener, this.cronInterval);
    }
    cancel() {
        this._queueStorageToQueueScheduler.cancel();
        this._queueStorageToQueueScheduler = undefined;
    }
    baseParams() {
        return () => ({ time: new Date() });
    }
    setUpListener() {
        this._listener = async ({ time }) => {
            const items = await this._storageEngine.findEventsToProcess(time, 100);
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