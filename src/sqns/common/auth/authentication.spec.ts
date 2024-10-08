import { expect } from 'chai';
import { AccessKey, SQNSError } from '../../../client';
import { setupConfig } from '../../../setup';
import { BaseStorageEngine } from '../model/base-storage-engine';
import { getSecretKey } from './authentication';

describe('Authentication', () => {
  context('getSecretKey', () => {
    class TempStorageEngine extends BaseStorageEngine {
      findAccessKey(): Promise<AccessKey> {
        return Promise.reject(new SQNSError({
          code: 'DatabaseError',
          message: 'Database find error.',
        }));
      }
    }

    it('should handle error while fetching key from database.', async () => {
      try {
        await getSecretKey(new TempStorageEngine(setupConfig.sqnsConfig.db))('dbAccessErrorKey');
        await Promise.reject({ code: 99, message: 'should not reach here.' });
      } catch (error) {
        const { code, message } = error as { code: number; message: string; };
        expect({ code, message }).deep.equal({ code: 'DatabaseError', message: 'Database find error.' });
      }
    });
  });
});
