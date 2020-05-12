"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const queue_storage_to_queue_scheduler_1 = require("./queue-storage-to-queue-scheduler");
class StorageToQueueWorker {
    constructor(storageEngine, addEventToQueueListener) {
        this._workerInterval = {};
        this._storageEngine = storageEngine;
        this._addEventToQueueListener = addEventToQueueListener;
        this.setUpListener();
        this.setUpInterval();
    }
    setUpIntervalForQueue(queueName) {
        if (this._workerInterval[queueName]) {
            return;
        }
        this._workerInterval[queueName] = new queue_storage_to_queue_scheduler_1.QueueStorageToQueueScheduler(queueName, this.baseParams(), this._listener);
    }
    startProcessingOfQueue(queueName) {
        this._workerInterval[queueName].startProcessingOfQueue();
    }
    async setUpInterval() {
        const queueNames = await this._storageEngine.getQueueNames();
        queueNames.forEach((queueName) => this.setUpIntervalForQueue(queueName));
    }
    baseParams() {
        return () => ({ time: new Date() });
    }
    setUpListener() {
        this._listener = async (queueName, { time }) => {
            const items = await this._storageEngine.findEventsToProcess(queueName, time);
            if (!items.length) {
                return [{}, false];
            }
            items.forEach((item) => this._addEventToQueueListener(queueName, item));
            return [{ time: items[items.length - 1].eventTime }, !!items.length];
        };
    }
}
exports.StorageToQueueWorker = StorageToQueueWorker;
//# sourceMappingURL=storage-to-queue-worker.js.map