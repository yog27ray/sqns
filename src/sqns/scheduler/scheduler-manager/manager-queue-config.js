"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManagerQueueConfig = void 0;
class ManagerQueueConfig {
    constructor(queueName) {
        this._sending = false;
        this._queueName = queueName;
    }
    get queueName() {
        return this._queueName;
    }
    get sending() {
        return this._sending;
    }
    set sending(value) {
        this._sending = value;
    }
    get queue() {
        return this._queue;
    }
    set queue(value) {
        this._queue = value;
    }
    get queryBaseParams() {
        return this._queryBaseParams;
    }
    set queryBaseParams(value) {
        this._queryBaseParams = value;
    }
    get listener() {
        return this._listener;
    }
    set listener(value) {
        this._listener = value;
    }
    get cloneBaseParams() {
        if (typeof this.queryBaseParams === 'function') {
            const baseParamsFunction = this.queryBaseParams;
            return baseParamsFunction();
        }
        return JSON.parse(JSON.stringify(this.queryBaseParams));
    }
}
exports.ManagerQueueConfig = ManagerQueueConfig;
//# sourceMappingURL=manager-queue-config.js.map