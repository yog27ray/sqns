"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventQueue = void 0;
const fifo_queue_1 = require("./processing-queue/fifo-queue");
const priority_queue_1 = require("./processing-queue/priority-queue");
class EventQueue {
    constructor() {
        this._notifyNeedTaskURLS = [];
        this._queueNameEventIds = {};
        this._queueName = {};
    }
    comparatorFunction(queueName, value) {
        this.priorityQueue(queueName).setComparatorFunction(value);
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
        this.eventIds(queueName)[item.id] = item;
        this.priorityQueue(queueName).add(item);
    }
    isEventPresent(queueName, eventItem) {
        return typeof this.eventIds(queueName)[eventItem.id] !== 'undefined';
    }
    findEventInQueue(queueName, eventItem) {
        return this.eventIds(queueName)[eventItem.id];
    }
    pop(queueName) {
        const item = this.priorityQueue(queueName).poll();
        delete this.eventIds(queueName)[item.id];
        return item;
    }
    reset(queueName) {
        this.priorityQueue(queueName).reset();
        delete this._queueNameEventIds[queueName];
    }
    resetAll() {
        this._queueName = {};
        this._queueNameEventIds = {};
    }
    size(queueName) {
        return this.priorityQueue(queueName).size();
    }
    queueNames() {
        return Object.keys(this._queueNameEventIds);
    }
    priorityQueue(queueName) {
        if (!this._queueName[queueName]) {
            this._queueName[queueName] = queueName.endsWith('.fifo')
                ? new fifo_queue_1.FifoQueue()
                : new priority_queue_1.PriorityQueue();
        }
        return this._queueName[queueName];
    }
}
exports.EventQueue = EventQueue;
//# sourceMappingURL=event-queue.js.map