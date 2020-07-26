"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoDBAdapter = void 0;
const uuid_1 = require("uuid");
const index_1 = require("../../../../index");
const queue_1 = require("../../event-manager/queue");
const mongo_d_b_connection_1 = require("./mongo-d-b-connection");
class MongoDBAdapter {
    constructor(config) {
        const option = { ...config };
        if (!option.uri) {
            throw Error('Database URI is missing');
        }
        const { uri } = option;
        delete option.uri;
        this.connection = new mongo_d_b_connection_1.MongoDBConnection(uri, option);
    }
    async addEventItem(queue, eventItem) {
        const currentTime = new Date();
        const mongoDocument = {
            ...eventItem,
            _id: eventItem.id,
            queueId: queue.id,
            updatedAt: currentTime,
            createdAt: currentTime,
        };
        delete mongoDocument.id;
        const eventTableName = this.getTableName('Event');
        try {
            await this.connection.insert(eventTableName, mongoDocument);
        }
        catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (error.code !== 11000) {
                await Promise.reject(error);
            }
        }
        const insertedMongoDocument = await this.connection.findOne(eventTableName, { _id: mongoDocument._id });
        return new index_1.EventItem(this.dbToSystemItem(insertedMongoDocument));
    }
    async findEventsToProcess(queue, time) {
        const mongoDocuments = await this.connection.find(this.getTableName('Event'), {
            queueId: queue.id,
            eventTime: { $lt: time },
            state: { $in: [index_1.EventItem.State.PENDING, index_1.EventItem.State.PROCESSING, index_1.EventItem.State.FAILURE] },
            $expr: { $lt: ['$receiveCount', '$maxReceiveCount'] },
        }, { eventTime: -1 }, 20);
        return mongoDocuments.map((mongoDocument) => this.dbToSystemItem(mongoDocument));
    }
    async getQueues(queueNamePrefix = '') {
        const queues = await this.connection.find(this.getTableName('Queues'), { name: { $regex: queueNamePrefix ? `^${queueNamePrefix}` : queueNamePrefix } }, { createdAt: 1 });
        return queues.map((queue) => new queue_1.Queue(this.dbToSystemItem(queue)));
    }
    async updateEvent(id, data) {
        await this.connection.update(this.getTableName('Event'), id, { ...data, updatedAt: new Date() });
    }
    async findById(id) {
        const event = await this.connection.findOne(this.getTableName('Event'), { _id: id });
        return new index_1.EventItem(this.dbToSystemItem(event));
    }
    async createQueue(queueName, attributes) {
        const queueTableName = this.getTableName('Queues');
        let queue = await this.getQueue(queueName);
        if (!queue) {
            await this.connection.insert(queueTableName, { _id: uuid_1.v4(), name: queueName, attributes });
            queue = await this.getQueue(queueName);
        }
        else {
            await this.connection.update(queueTableName, queue.id, { attributes });
        }
        return queue;
    }
    async getQueue(name) {
        const queueTableName = this.getTableName('Queues');
        const dbQueue = await this.connection.findOne(queueTableName, { name });
        if (!dbQueue) {
            return undefined;
        }
        return new queue_1.Queue(this.dbToSystemItem(dbQueue));
    }
    async deleteQueue(queue) {
        const queueTableName = this.getTableName('Queues');
        const eventTableName = this.getTableName('Event');
        await this.connection.deleteOne(queueTableName, { _id: queue.id });
        await this.connection.deleteMany(eventTableName, { queueId: queue.id });
    }
    dbToSystemItem(row) {
        const document = { ...row };
        document.id = document._id;
        delete document._id;
        return document;
    }
    getTableName(queueName) {
        return `${MongoDBAdapter.QUEUE_TABLE_PREFIX}${queueName}`;
    }
}
exports.MongoDBAdapter = MongoDBAdapter;
MongoDBAdapter.QUEUE_TABLE_PREFIX = '_Queue_';
//# sourceMappingURL=mongo-d-b-adapter.js.map