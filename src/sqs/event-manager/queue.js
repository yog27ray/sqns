"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Queue = void 0;
class Queue {
    constructor(item) {
        this.createdAt = new Date();
        this.id = item.id;
        this.name = item.name;
        this.attributes = item.attributes || {};
        this.tags = item.tags || {};
        this.createdAt = item.createdAt || this.createdAt;
        this.createdAt = item.updatedAt || this.createdAt;
    }
    toJSON() {
        const json = {};
        Object.getOwnPropertyNames(this).forEach((property) => {
            json[property] = this[property];
        });
        return json;
    }
    clone() {
        const queueJSON = this.toJSON();
        return new Queue(queueJSON);
    }
    getExponentialFactor() {
        return Number(this.attributes.visibilityTimeoutExponentialFactor || '1');
    }
    calculateNewEventTime(time, exponentialPower, delayInSeconds) {
        const delayTime = (this.getExponentialFactor() ** exponentialPower) * delayInSeconds * 1000;
        return new Date(time.getTime() + delayTime);
    }
    getMaxReceiveCount() {
        return Math.max(Number(this.attributes.maxReceiveCount || '3'), 1);
    }
}
exports.Queue = Queue;
//# sourceMappingURL=queue.js.map