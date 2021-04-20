import { expect } from 'chai';
import { dropDatabase, setupConfig } from '../../../setup';
import { Env } from '../../../test-env';
import { BaseStorageEngine } from './base-storage-engine';

describe('BaseStorageEngine', () => {
  context('Error Handler', () => {
    it('should return undefined when unknown resource arn is provided', async () => {
      try {
        const baseStorageEngine = new BaseStorageEngine({ database: undefined, config: undefined, uri: undefined });
        await Promise.reject({ code: 99, message: 'Should not be here.', baseStorageEngine });
      } catch (error) {
        const { code, message } = error;
        expect({ code, message }).to.deep.equal({
          code: 'DatabaseNotSupported',
          message: 'UnSupported Database',
        });
      }
    });
  });

  context('updating existing admin secret keys', () => {
    let storageAdapter: BaseStorageEngine;
    before(() => {
      storageAdapter = new BaseStorageEngine(setupConfig.sqnsConfig.db);
    });

    beforeEach(async () => {
      await dropDatabase();
    });

    it('should do nothing when secret key is same', async () => {
      await storageAdapter.initialize([{
        accessKey: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
      }]);
      const adminKeys = await setupConfig.mongoConnection.find(storageAdapter.getDBTableName('AccessKey'));
      expect(adminKeys.length).to.equal(1);
      expect(adminKeys[0].secretKey).to.equal(Env.secretAccessKey);
      expect(adminKeys[0].createdAt.getTime()).to.equal(adminKeys[0].updatedAt.getTime());
    });

    it('should update secret key when secret key is different', async () => {
      await storageAdapter.initialize([{
        accessKey: Env.accessKeyId,
        secretAccessKey: 'newSecretKey',
      }]);
      const adminKeys = await setupConfig.mongoConnection.find(storageAdapter.getDBTableName('AccessKey'));
      expect(adminKeys.length).to.equal(1);
      expect(adminKeys[0].secretKey).to.equal('newSecretKey');
      expect(adminKeys[0].createdAt.getTime()).to.not.equal(adminKeys[0].updatedAt.getTime());
    });
  });
});
