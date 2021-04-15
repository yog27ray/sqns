import { KeyValue } from '../../../../typings/common';
import { AdminSecretKeys, DatabaseConfig } from '../../../../typings/config';
import { SQNSError } from '../auth/s-q-n-s-error';
import { Database } from '../database';
import { MongoDBAdapter } from '../database/mongodb/mongo-d-b-adapter';
import { StorageAdapter } from '../database/storage-adapter';
import { AccessKey } from './access-key';
import { User } from './user';

export class BaseStorageEngine {
  static Database = Database;

  protected readonly _storageAdapter: StorageAdapter;

  constructor(databaseConfig: DatabaseConfig) {
    switch (databaseConfig.database) {
      case Database.MONGO_DB: {
        this._storageAdapter = new MongoDBAdapter({ uri: databaseConfig.uri, ...databaseConfig.config });
        break;
      }
      default: {
        throw new SQNSError({
          code: 'DatabaseNotSupported',
          message: 'UnSupported Database',
        });
      }
    }
  }

  async initialize(adminSecretKeys: Array<AdminSecretKeys>): Promise<void> {
    await Promise.all(adminSecretKeys.map(async (adminSecretKey: AdminSecretKeys) => {
      const organizationId = '1';
      const user = await this.findUser({ organizationId })
        .catch((error: SQNSError) => (error.code === 'NotFound'
          ? this.createUser(organizationId)
          : Promise.reject(error)));
      const accessKey = await this.findAccessKey({ accessKey: adminSecretKey.accessKey })
        .catch((error: SQNSError) => (error.code === 'NotFound'
          ? this.createAccessKey(adminSecretKey.accessKey, adminSecretKey.secretAccessKey, user.id)
          : Promise.reject(error)));
      if (accessKey.secretKey === adminSecretKey.secretAccessKey) {
        return;
      }
      accessKey.secretKey = adminSecretKey.secretAccessKey;
      await this.updateAccessKey(accessKey);
    }));
  }

  updateAccessKey(accessKey: AccessKey): Promise<AccessKey> {
    return this._storageAdapter.updateAccessKey(accessKey);
  }

  createAccessKey(accessKey: string, secretAccessKey: string, userId: string): Promise<AccessKey> {
    return this._storageAdapter.accessKey(accessKey, secretAccessKey, userId);
  }

  createUser(organizationId: string): Promise<User> {
    return this._storageAdapter.createUser(organizationId);
  }

  async findAccessKey(where: KeyValue): Promise<AccessKey> {
    const [accessKey] = await this._storageAdapter.findAccessKeys(where, 0, 1);
    if (!accessKey) {
      SQNSError.invalidAccessKey();
    }
    return accessKey;
  }

  async findUser(where: KeyValue): Promise<User> {
    const [user] = await this._storageAdapter.findUsers(where, 0, 1);
    if (!user) {
      SQNSError.invalidUser();
    }
    return user;
  }

  getDBTableName(tableName: string): string {
    return this._storageAdapter.getDBTableName(tableName);
  }
}
