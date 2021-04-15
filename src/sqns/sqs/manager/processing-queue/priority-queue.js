"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriorityQueue = void 0;
const fastpriorityqueue_1 = __importDefault(require("fastpriorityqueue"));
class PriorityQueue {
    constructor() {
        this._comparator = (event1, event2) => (event1.priority < event2.priority);
        this._default = this._comparator;
        this.reset();
    }
    setComparatorFunction(comparatorFunction) {
        if (!comparatorFunction) {
            return;
        }
        this._comparator = comparatorFunction;
    }
    poll() {
        return this._queue.poll();
    }
    add(item) {
        this._queue.add(item);
    }
    size() {
        return this._queue.size;
    }
    reset() {
        this._queue = new fastpriorityqueue_1.default((event1, event2) => (this._comparator(event1, event2)));
    }
}
exports.PriorityQueue = PriorityQueue;
//# sourceMappingURL=priority-queue.js.map