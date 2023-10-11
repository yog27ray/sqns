"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerQueueConfig = void 0;
class WorkerQueueConfig {
    constructor(queueName, listener, config = { MAX_COUNT: 1 }) {
        this._polling = false;
        this._hasMore = true;
        this._count = 0;
        this._queueName = queueName;
        this._config = Object.freeze({ ...config });
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
    get count() {
        return this._count;
    }
    incrementCount() {
        this._count += 1;
    }
    decrementCount() {
        this._count -= 1;
    }
    clone() {
        return new WorkerQueueConfig(this.queueName, this.listener, { MAX_COUNT: this.config.MAX_COUNT });
    }
}
exports.WorkerQueueConfig = WorkerQueueConfig;
//# sourceMappingURL=worker-queue-config.js.map