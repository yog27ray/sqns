import { expect } from 'chai';
import { BaseStorageEngine } from './base-storage-engine';

describe('BaseStorageEngine', () => {
  context('Error Handler', () => {
    it('should return undefined when unknown resource arn is provided', async () => {
      try {
        const baseStorageEngine = new BaseStorageEngine({ database: undefined, config: undefined, uri: undefined }, undefined);
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
});
