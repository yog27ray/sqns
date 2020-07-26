"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryAdapter = void 0;
const uuid_1 = require("uuid");
const event_item_1 = require("../../event-manager/event-item");
const queue_1 = require("../../event-manager/queue");
class InMemoryAdapter {
    constructor(config) {
        this._db = {};
        this._config = config;
    }
    addEventItem(queue, item) {
        const insertedItem = item.clone();
        const queueList = this.getDBQueue(queue.name);
        if (item.id) {
            const queueItem = queueList.find((existingItem) => insertedItem.id === existingItem.id);
            if (queueItem) {
                return Promise.resolve(queueItem.clone());
            }
        }
        queueList.push(insertedItem);
        return Promise.resolve(insertedItem.clone());
    }
    findEventsToProcess(queue, time) {
        const eventsToProcess = [];
        const queueList = this.getDBQueue(queue.name);
        queueList.sort((item1, item2) => {
            const value1 = item1.eventTime.getTime();
            const value2 = item2.eventTime.getTime();
            if (value1 === value2) {
                return 0;
            }
            if (value1 > value2) {
                return -1;
            }
            return 1;
        });
        queueList.forEach((eventItem) => {
            if (eventItem.eventTime.getTime() < time.getTime()) {
                eventsToProcess.push(eventItem);
            }
        });
        return Promise.resolve(eventsToProcess);
    }
    getQueues(queueNamePrefix = '') {
        return Promise.resolve(Object.keys(this._db).filter((each) => each.startsWith(queueNamePrefix))
            .map((each) => this._db[each].queue));
    }
    async updateEvent(id, data) {
        const eventItem = await this.findById(id);
        Object.keys(data).forEach((key) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            eventItem[key] = data[key];
        });
        if (eventItem.state === event_item_1.EventState.SUCCESS || eventItem.receiveCount >= eventItem.maxReceiveCount) {
            const queue = Object.values(this._db).find((each) => each.list.includes(eventItem));
            queue.list = queue.list.filter((each) => (each !== eventItem));
        }
    }
    findById(id) {
        const allEvents = [];
        Object.values(this._db).forEach((each) => allEvents.push(...each.list));
        return Promise.resolve(allEvents.find((each) => each.id === id));
    }
    createQueue(queueName, attributes, tag) {
        this._createQueue(queueName, attributes, tag);
        return Promise.resolve(this._db[queueName].queue);
    }
    getQueue(queueName) {
        if (!this._db[queueName]) {
            return undefined;
        }
        return Promise.resolve(this._db[queueName].queue.clone());
    }
    deleteQueue(queue) {
        delete this._db[queue.name];
        return Promise.resolve();
    }
    _createQueue(queueName, attributes, tags) {
        if (!this._db[queueName]) {
            const queue = new queue_1.Queue({ id: uuid_1.v4(), attributes, name: queueName, tags });
            this._db[queueName] = { list: [], queue };
        }
    }
    getDBQueue(queueName) {
        return this._db[queueName].list;
    }
}
exports.InMemoryAdapter = InMemoryAdapter;
//# sourceMappingURL=in-memory-adapter.js.map