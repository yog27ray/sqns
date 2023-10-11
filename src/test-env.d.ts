import { MongoDBConnection } from './sqns/common/database/mongodb/mongo-d-b-connection';
import { BaseStorageEngine } from './sqns/common/model/base-storage-engine';
import { SQNSClient } from './sqns/s-q-n-s-client';
declare const Env: {
    URL: string;
    PORT: number;
    companyId: string;
    accessKeyId: string;
    secretAccessKey: string;
};
declare function deleteTopics(client: SQNSClient, storageAdapter: BaseStorageEngine): Promise<void>;
declare function wait(time?: number): Promise<void>;
declare function deleteAllQueues(client: SQNSClient, storageAdapter: BaseStorageEngine, mongoDBConnection: MongoDBConnection): Promise<void>;
declare function deleteDynamicDataOfResults(items_: Record<string, unknown>): void;
export { Env, deleteDynamicDataOfResults, deleteTopics, deleteAllQueues, wait };
