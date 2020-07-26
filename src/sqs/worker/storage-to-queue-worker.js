"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageToQueueWorker = void 0;
const debug_1 = __importDefault(require("debug"));
const queue_storage_to_queue_scheduler_1 = require("./queue-storage-to-queue-scheduler");
const log = debug_1.default('sqns:TestServer');
class StorageToQueueWorker {
    constructor(storageEngine, addEventToQueueListener, cronInterval) {
        this._workerInterval = {};
        this._storageEngine = storageEngine;
        this._addEventToQueueListener = addEventToQueueListener;
        this.cronInterval = cronInterval;
        this.setUpListener();
        this.setUpInterval().catch((error) => log(error));
    }
    setUpIntervalForQueue(queueName) {
        if (this._workerInterval[queueName]) {
            return;
        }
        this._workerInterval[queueName] = new queue_storage_to_queue_scheduler_1.QueueStorageToQueueScheduler(queueName, this.baseParams(), this._listener, this.cronInterval);
    }
    cancel() {
        Object.keys(this._workerInterval).forEach((queueName) => {
            this._workerInterval[queueName].cancel();
            delete this._workerInterval[queueName];
        });
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