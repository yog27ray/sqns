"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const inversify_1 = require("inversify");
let CollectorConfig = class CollectorConfig {
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
};
CollectorConfig = __decorate([
    inversify_1.injectable()
], CollectorConfig);
exports.CollectorConfig = CollectorConfig;
//# sourceMappingURL=collector-config.js.map