"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManagerConfig = void 0;
class ManagerConfig {
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
}
exports.ManagerConfig = ManagerConfig;
//# sourceMappingURL=manager-config.js.map