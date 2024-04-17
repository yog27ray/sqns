import { Database } from '../src/sqns/common/database';
import { KeyValue } from './common';
import { RequestItem } from './request-item';
export declare interface MongoDBConfig {
    uri: string;
    [key: string]: unknown;
}
export declare interface AdminSecretKeys {
    secretAccessKey: string;
    accessKey: string;
}
export declare interface DatabaseConfig {
    uri: string;
    config: KeyValue;
    database?: Database;
}
export declare interface SQSConfig {
    endpoint: string;
    db: DatabaseConfig;
    requestTasks?: Array<string>;
    cronInterval?: string;
    enableSNSQueue?: boolean;
}
export declare interface SQNSLoggingConfig {
    json?: boolean;
    stringOnly?: boolean;
}
export declare interface SNSConfig {
    endpoint: string;
    db: DatabaseConfig;
    queueEndpoint?: string;
    queueSecretAccessKey?: string;
    queueAccessKey?: string;
    disableWorker?: boolean;
    logging?: SQNSLoggingConfig;
}
export declare interface SQNSConfig {
    endpoint: string;
    adminSecretKeys: Array<{
        accessKey: string;
        secretAccessKey: string;
    }>;
    db: DatabaseConfig;
    sqs?: {
        cronInterval?: string;
        disable?: boolean;
    };
    sns?: {
        queueEndpoint?: string;
        queueSecretAccessKey?: string;
        queueAccessKey?: string;
        disable?: boolean;
        disableWorker?: boolean;
    };
    logging?: SQNSLoggingConfig;
}
export declare type ManagerQueueConfigListener = (queueName: string, nextItemListParams: KeyValue) => Promise<[
    KeyValue,
    Array<RequestItem>
]>;
export declare interface ConfigCount {
    MAX_COUNT: number;
}
export declare type QueueStorageToQueueConfigListener = (nextItemListParams: KeyValue) => Promise<[KeyValue, boolean]>;
