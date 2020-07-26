"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerConfig = void 0;
class WorkerConfig {
    constructor() {
        this._config = { count: 0 };
        this._polling = false;
        this._hasMore = true;
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
    get listener() {
        return this._listener;
    }
    set listener(value) {
        this._listener = value;
    }
    get hasMore() {
        return this._hasMore;
    }
    set hasMore(value) {
        this._hasMore = value;
    }
}
exports.WorkerConfig = WorkerConfig;
//# sourceMappingURL=worker-config.js.map