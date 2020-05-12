"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class InMemoryAdapter {
    constructor(config) {
        this._db = {};
        this._config = config;
    }
    addEventItem(queueName, item) {
        this.getDBQueue(queueName).push(item);
        return Promise.resolve(item);
    }
    findEventsToProcess(queueName, time) {
        const eventsToProcess = [];
        const queue = this.getDBQueue(queueName);
        for (let i = queue.length - 1; i >= 0; i -= 1) {
            if (queue[i].eventTime.getTime() <= time.getTime()) {
                eventsToProcess.push(queue.splice(i, 1)[0]);
            }
        }
        return Promise.resolve(eventsToProcess.sort((item1, item2) => {
            const value1 = item1.eventTime.getTime();
            const value2 = item2.eventTime.getTime();
            if (value1 === value2) {
                return 0;
            }
            if (value1 > value2) {
                return 1;
            }
            return -1;
        }));
    }
    getQueueNames() {
        return Promise.resolve(Object.keys(this._db));
    }
    updateEvent(queueName, id, data) {
        return Promise.resolve(data);
    }
    getDBQueue(queueName) {
        if (!this._db[queueName]) {
            this._db[queueName] = [];
        }
        return this._db[queueName];
    }
}
exports.InMemoryAdapter = InMemoryAdapter;
//# sourceMappingURL=in-memory-adapter.js.map