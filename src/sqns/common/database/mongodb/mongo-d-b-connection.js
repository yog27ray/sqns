"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoDBConnection = void 0;
const mongodb_1 = require("mongodb");
class MongoDBConnection {
    constructor(uri, config) {
        this._uri = uri;
        this._option = config;
        if (this._uri) {
            this._dBName = uri.split('?')[0].split('/').pop();
        }
    }
    isConnected() {
        return !!this.client && this.client.isConnected();
    }
    async connect() {
        if (this.isConnected()) {
            return;
        }
        let client;
        if (!this.client) {
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
            client = new mongodb_1.MongoClient(this._uri, this._option);
        }
        else {
            ({ client } = this);
        }
        this.client = await client.connect();
    }
    async find(tableName, query_ = {}, sort = {}, { limit, skip } = {}) {
        await this.connect();
        const query = query_;
        if (query.id) {
            query._id = query.id;
            delete query.id;
        }
        return this.getDB().collection(tableName).find(query, { sort, limit, skip }).toArray();
    }
    async findOne(tableName, filter_ = {}) {
        const filter = filter_;
        await this.connect();
        if (filter.id) {
            filter._id = filter.id;
            delete filter.id;
        }
        return await this.getDB().collection(tableName).findOne(filter);
    }
    async dropDatabase() {
        if (!this._dBName) {
            return Promise.resolve();
        }
        await this.connect();
        return new Promise((resolve, reject) => {
            this.getDB().dropDatabase((error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
    }
    async insert(collectionName, item_) {
        await this.connect();
        const item = item_;
        if (item.id) {
            item._id = item.id;
            delete item.id;
        }
        const newDocument = await this.getDB().collection(collectionName).insertOne(item);
        return newDocument.insertedId;
    }
    async update(collectionName, documentId, document) {
        await this.connect();
        await this.getDB().collection(collectionName).updateOne({ _id: documentId }, { $set: { ...document, updatedAt: new Date() } });
    }
    async deleteOne(collectionName, filter) {
        await this.connect();
        await this.getDB().collection(collectionName).deleteOne(filter);
    }
    async count(collectionName, filter) {
        await this.connect();
        return this.getDB().collection(collectionName).countDocuments(filter);
    }
    async deleteMany(collectionName, filter) {
        await this.connect();
        await this.getDB().collection(collectionName).deleteMany(filter);
    }
    getDB() {
        return this.client.db(this._dBName);
    }
}
exports.MongoDBConnection = MongoDBConnection;
//# sourceMappingURL=mongo-d-b-connection.js.map