"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../../index");
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
    async addEventItem(queueName, eventItem) {
        const mongoDocument = { ...eventItem };
        mongoDocument._id = mongoDocument.id;
        delete mongoDocument.id;
        let insertedMongoDocument;
        try {
            await this.connection.insert(this.getTableName(queueName), mongoDocument);
        }
        catch (error) {
            if (error.code !== 11000) {
                await Promise.reject(error);
            }
        }
        if (!insertedMongoDocument) {
            insertedMongoDocument = await this.connection.findOne(this.getTableName(queueName), { _id: mongoDocument._id });
        }
        return this.dbToSystemItem(insertedMongoDocument);
    }
    async findEventsToProcess(queueName, time) {
        const mongoDocuments = await this.connection.find(this.getTableName(queueName), { eventTime: { $lt: time }, state: index_1.EventItem.State.PENDING }, { eventTime: 1 });
        return mongoDocuments.map((mongoDocument) => this.dbToSystemItem(mongoDocument));
    }
    async getQueueNames() {
        const allCollections = await this.connection.getCollections();
        return allCollections.filter((collectionName) => collectionName.startsWith(MongoDBAdapter.QUEUE_TABLE_PREFIX))
            .map((collectionName) => collectionName.split(MongoDBAdapter.QUEUE_TABLE_PREFIX)[1]);
    }
    async updateEvent(queueName, id, data) {
        await this.connection.update(this.getTableName(queueName), id, data);
    }
    dbToSystemItem(document) {
        const systemItem = { ...document };
        systemItem.id = systemItem._id;
        delete systemItem._id;
        return systemItem;
    }
    getTableName(queueName) {
        return `${MongoDBAdapter.QUEUE_TABLE_PREFIX}${queueName}`;
    }
}
exports.MongoDBAdapter = MongoDBAdapter;
MongoDBAdapter.QUEUE_TABLE_PREFIX = '_Queue_';
//# sourceMappingURL=mongo-d-b-adapter.js.map