"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FifoQueue = void 0;
class FifoQueue {
    constructor() {
        this._queue = [];
    }
    setComparatorFunction() { }
    add(item) {
        this._queue.push(item);
    }
    poll() {
        return this._queue.pop();
    }
    size() {
        return this._queue.length;
    }
    reset() {
        this._queue = [];
    }
}
exports.FifoQueue = FifoQueue;
//# sourceMappingURL=fifo-queue.js.map