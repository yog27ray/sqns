"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const setup_1 = require("../../../setup");
const test_env_1 = require("../../../test-env");
const base_storage_engine_1 = require("./base-storage-engine");
describe('BaseStorageEngine', () => {
    context('Error Handler', () => {
        it('should return undefined when unknown resource arn is provided', async () => {
            try {
                const baseStorageEngine = new base_storage_engine_1.BaseStorageEngine({ database: undefined, config: undefined, uri: undefined }, undefined);
                await Promise.reject({ code: 99, message: 'Should not be here.', baseStorageEngine });
            }
            catch (error) {
                const { code, message } = error;
                chai_1.expect({ code, message }).to.deep.equal({
                    code: 'DatabaseNotSupported',
                    message: 'UnSupported Database',
                });
            }
        });
    });
    context('updating existing admin secret keys', () => {
        let storageAdapter;
        before(() => {
            storageAdapter = new base_storage_engine_1.BaseStorageEngine(setup_1.setupConfig.sqnsConfig.db, []);
        });
        beforeEach(async () => {
            await setup_1.dropDatabase();
        });
        it('should do nothing when secret key is same', async () => {
            await storageAdapter.initialize([{
                    accessKey: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                }]);
            const adminKeys = await setup_1.setupConfig.mongoConnection.find(storageAdapter.getDBTableName('AccessKey'));
            chai_1.expect(adminKeys.length).to.equal(1);
            chai_1.expect(adminKeys[0].secretKey).to.equal(test_env_1.Env.secretAccessKey);
            chai_1.expect(adminKeys[0].createdAt.getTime()).to.equal(adminKeys[0].updatedAt.getTime());
        });
        it('should update secret key when secret key is different', async () => {
            await storageAdapter.initialize([{
                    accessKey: test_env_1.Env.accessKeyId,
                    secretAccessKey: 'newSecretKey',
                }]);
            const adminKeys = await setup_1.setupConfig.mongoConnection.find(storageAdapter.getDBTableName('AccessKey'));
            chai_1.expect(adminKeys.length).to.equal(1);
            chai_1.expect(adminKeys[0].secretKey).to.equal('newSecretKey');
            chai_1.expect(adminKeys[0].createdAt.getTime()).to.not.equal(adminKeys[0].updatedAt.getTime());
        });
    });
});
//# sourceMappingURL=base-storage-engine.spec.js.map