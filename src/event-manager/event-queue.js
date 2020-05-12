"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastpriorityqueue_1 = __importDefault(require("fastpriorityqueue"));
const inversify_1 = require("inversify");
// tslint:disable-next-line:no-import-side-effect
require("reflect-metadata");
let EventQueue = class EventQueue {
    constructor() {
        this._notifyNeedTaskURLS = [];
        this._queueNameEventIds = {};
        this._queueName = {};
        this._comparatorFunctionMap = {};
        this._defaultComparatorFunction = (event1, event2) => (event1.priority < event2.priority);
    }
    comparatorFunction(queueName, value) {
        this._comparatorFunctionMap[queueName] = value;
        this.reset(queueName);
    }
    set notifyNeedTaskURLS(value) {
        this._notifyNeedTaskURLS = value;
    }
    get notifyNeedTaskURLS() {
        return this._notifyNeedTaskURLS;
    }
    eventIds(queueName) {
        if (!this._queueNameEventIds[queueName]) {
            this._queueNameEventIds[queueName] = {};
        }
        return this._queueNameEventIds[queueName];
    }
    add(queueName, item) {
        this.eventIds(queueName)[item.id] = item.priority;
        this.priorityQueue(queueName).add(item);
    }
    isEventPresent(queueName, eventItem) {
        return typeof this.eventIds(queueName)[eventItem.id] !== 'undefined';
    }
    pop(queueName) {
        const item = this.priorityQueue(queueName).poll();
        delete this.eventIds(queueName)[item.id];
        return item;
    }
    reset(queueName) {
        delete this._queueName[queueName];
        delete this._queueNameEventIds[queueName];
    }
    resetAll() {
        this._queueName = {};
        this._queueNameEventIds = {};
    }
    size(queueName) {
        return this.priorityQueue(queueName).size;
    }
    queueNames() {
        return Object.keys(this._queueNameEventIds);
    }
    priorityQueue(queueName) {
        if (!this._queueName[queueName]) {
            this._queueName[queueName] = new fastpriorityqueue_1.default((event1, event2) => {
                if (this._comparatorFunctionMap[queueName]) {
                    return this._comparatorFunctionMap[queueName](event1, event2);
                }
                return this._defaultComparatorFunction(event1, event2);
            });
        }
        return this._queueName[queueName];
    }
};
EventQueue = __decorate([
    inversify_1.injectable(),
    __metadata("design:paramtypes", [])
], EventQueue);
exports.EventQueue = EventQueue;
//# sourceMappingURL=event-queue.js.map