"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerQueueConfig = void 0;
class WorkerQueueConfig {
    constructor(queueName, listener) {
        this._config = { count: 0, MAX_COUNT: 1 };
        this._polling = false;
        this._hasMore = true;
        this._queueName = queueName;
        this._listener = listener;
    }
    get queueName() {
        return this._queueName;
    }
    get config() {
        return this._config;
    }
    get polling() {
        return this._polling;
    }
    set polling(value) {
        this._polling = value;
    }
    get queue() {
        return this._queue;
    }
    set queue(value) {
        this._queue = value;
    }
    get listener() {
        return this._listener;
    }
    get hasMore() {
        return this._hasMore;
    }
    set hasMore(value) {
        this._hasMore = value;
    }
    clone() {
        const config = new WorkerQueueConfig(this.queueName, this.listener);
        config._config = { MAX_COUNT: this.config.MAX_COUNT, count: 0 };
        return config;
    }
}
exports.WorkerQueueConfig = WorkerQueueConfig;
//# sourceMappingURL=worker-queue-config.js.map