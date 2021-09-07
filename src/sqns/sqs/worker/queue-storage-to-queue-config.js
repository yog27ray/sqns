"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueStorageToQueueConfig = void 0;
class QueueStorageToQueueConfig {
    constructor() {
        this._sending = false;
    }
    get sending() {
        return this._sending;
    }
    set sending(value) {
        this._sending = value;
    }
    get baseParams() {
        return this._baseParams;
    }
    set baseParams(value) {
        this._baseParams = value;
    }
    get listener() {
        return this._listener;
    }
    set listener(value) {
        this._listener = value;
    }
    get cloneBaseParams() {
        if (typeof this.baseParams === 'function') {
            return this.baseParams();
        }
        return JSON.parse(JSON.stringify(this.baseParams));
    }
}
exports.QueueStorageToQueueConfig = QueueStorageToQueueConfig;
//# sourceMappingURL=queue-storage-to-queue-config.js.map