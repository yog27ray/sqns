"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
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
            const options = {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                ...this._option,
            };
            if (this.isFilePath(options.sslCA)) {
                options.sslCA = fs_1.default.readFileSync(options.sslCA);
            }
            if (this.isFilePath(this._option.sslCert)) {
                options.sslCert = fs_1.default.readFileSync(options.sslCert);
            }
            if (this.isFilePath(this._option.sslKey)) {
                options.sslKey = fs_1.default.readFileSync(options.sslKey);
            }
            client = new mongodb_1.MongoClient(this._uri, options);
        }
        else {
            ({ client } = this);
        }
        this.client = await client.connect();
    }
    async find(tableName, query = {}, sort = {}) {
        await this.connect();
        return this.getDB().collection(tableName).find(query, { sort }).toArray();
    }
    async findOne(tableName, query = {}) {
        await this.connect();
        return this.getDB().collection(tableName).findOne(query);
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
    async getCollections() {
        await this.connect();
        const collections = await this.getDB().listCollections().toArray();
        return collections.map((collection) => collection.name);
    }
    async insert(collectionName, eventItem) {
        await this.connect();
        await this.getDB().collection(collectionName).insertOne(eventItem);
    }
    async update(collectionName, documentId, document) {
        await this.connect();
        await this.getDB().collection(collectionName).updateOne({ _id: documentId }, { $set: document });
    }
    getDB() {
        return this.client.db(this._dBName);
    }
    isFilePath(sslCA) {
        return typeof sslCA === 'string';
    }
}
exports.MongoDBConnection = MongoDBConnection;
//# sourceMappingURL=mongo-d-b-connection.js.map