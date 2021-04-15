"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseStorageEngine = void 0;
const s_q_n_s_error_1 = require("../auth/s-q-n-s-error");
const database_1 = require("../database");
const mongo_d_b_adapter_1 = require("../database/mongodb/mongo-d-b-adapter");
class BaseStorageEngine {
    constructor(databaseConfig) {
        switch (databaseConfig.database) {
            case database_1.Database.MONGO_DB: {
                this._storageAdapter = new mongo_d_b_adapter_1.MongoDBAdapter({ uri: databaseConfig.uri, ...databaseConfig.config });
                break;
            }
            default: {
                throw new s_q_n_s_error_1.SQNSError({
                    code: 'DatabaseNotSupported',
                    message: 'UnSupported Database',
                });
            }
        }
    }
    async initialize(adminSecretKeys) {
        await Promise.all(adminSecretKeys.map(async (adminSecretKey) => {
            const organizationId = '1';
            const user = await this.findUser({ organizationId })
                .catch((error) => (error.code === 'NotFound'
                ? this.createUser(organizationId)
                : Promise.reject(error)));
            const accessKey = await this.findAccessKey({ accessKey: adminSecretKey.accessKey })
                .catch((error) => (error.code === 'NotFound'
                ? this.createAccessKey(adminSecretKey.accessKey, adminSecretKey.secretAccessKey, user.id)
                : Promise.reject(error)));
            if (accessKey.secretKey === adminSecretKey.secretAccessKey) {
                return;
            }
            accessKey.secretKey = adminSecretKey.secretAccessKey;
            await this.updateAccessKey(accessKey);
        }));
    }
    updateAccessKey(accessKey) {
        return this._storageAdapter.updateAccessKey(accessKey);
    }
    createAccessKey(accessKey, secretAccessKey, userId) {
        return this._storageAdapter.accessKey(accessKey, secretAccessKey, userId);
    }
    createUser(organizationId) {
        return this._storageAdapter.createUser(organizationId);
    }
    async findAccessKey(where) {
        const [accessKey] = await this._storageAdapter.findAccessKeys(where, 0, 1);
        if (!accessKey) {
            s_q_n_s_error_1.SQNSError.invalidAccessKey();
        }
        return accessKey;
    }
    async findUser(where) {
        const [user] = await this._storageAdapter.findUsers(where, 0, 1);
        if (!user) {
            s_q_n_s_error_1.SQNSError.invalidUser();
        }
        return user;
    }
    getDBTableName(tableName) {
        return this._storageAdapter.getDBTableName(tableName);
    }
}
exports.BaseStorageEngine = BaseStorageEngine;
BaseStorageEngine.Database = database_1.Database;
//# sourceMappingURL=base-storage-engine.js.map