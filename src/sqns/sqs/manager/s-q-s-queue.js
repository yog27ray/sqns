"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQSQueue = void 0;
const fifo_queue_1 = require("./processing-queue/fifo-queue");
const priority_queue_1 = require("./processing-queue/priority-queue");
class SQSQueue {
    constructor() {
        this._notifyNeedTaskURLS = [];
        this._queueARNEventIds = {};
        this._queueARN = {};
    }
    comparatorFunction(queueARN, value) {
        this.priorityQueue(queueARN).setComparatorFunction(value);
        this.reset(queueARN);
    }
    set notifyNeedTaskURLS(value) {
        this._notifyNeedTaskURLS = value;
    }
    get notifyNeedTaskURLS() {
        return this._notifyNeedTaskURLS;
    }
    eventIds(queueARN) {
        if (!this._queueARNEventIds[queueARN]) {
            this._queueARNEventIds[queueARN] = {};
        }
        return this._queueARNEventIds[queueARN];
    }
    add(item) {
        this.eventIds(item.queueARN)[item.id] = item;
        this.priorityQueue(item.queueARN).add(item);
    }
    isEventPresent(eventItem) {
        return typeof this.eventIds(eventItem.queueARN)[eventItem.id] !== 'undefined';
    }
    findEventInQueue(queueARN, eventItem) {
        return this.eventIds(queueARN)[eventItem.id];
    }
    popInitiate(queueARN) {
        return this.priorityQueue(queueARN).poll();
    }
    popComplete(eventItem) {
        delete this.eventIds(eventItem.queueARN)[eventItem.id];
    }
    reset(queueARN) {
        this.priorityQueue(queueARN).reset();
        delete this._queueARNEventIds[queueARN];
    }
    resetAll() {
        this._queueARN = {};
        this._queueARNEventIds = {};
    }
    size(queueARN) {
        return this.priorityQueue(queueARN).size();
    }
    queueARNs() {
        return Object.keys(this._queueARNEventIds);
    }
    priorityQueue(queueARN) {
        if (!this._queueARN[queueARN]) {
            this._queueARN[queueARN] = queueARN.endsWith('.fifo')
                ? new fifo_queue_1.FifoQueue()
                : new priority_queue_1.PriorityQueue();
        }
        return this._queueARN[queueARN];
    }
}
exports.SQSQueue = SQSQueue;
//# sourceMappingURL=s-q-s-queue.js.map