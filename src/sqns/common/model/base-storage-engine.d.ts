import { KeyValue } from '../../../../typings/typings';
import { AdminSecretKeys, DatabaseConfig } from '../../../../typings/config';
import { Database } from '../database';
import { StorageAdapter } from '../database/storage-adapter';
import { AccessKey } from './access-key';
import { User } from './user';
export declare class BaseStorageEngine {
    static Database: typeof Database;
    protected readonly _storageAdapter: StorageAdapter;
    constructor(databaseConfig: DatabaseConfig, adminSecretKeys: Array<AdminSecretKeys>);
    initialize(adminSecretKeys: Array<AdminSecretKeys>): Promise<void>;
    updateAccessKey(accessKey: AccessKey): Promise<AccessKey>;
    createAccessKey(accessKey: string, secretAccessKey: string, userId: string): Promise<AccessKey>;
    createUser(organizationId: string): Promise<User>;
    findAccessKey(where: KeyValue): Promise<AccessKey>;
    findUser(where: KeyValue): Promise<User>;
    getDBTableName(tableName: string): string;
}
