import { Database } from '../src/sqns/common/database';
import { Queue } from '../src/sqns/common/model/queue';
import { KeyValue } from './common';
import { RequestItem } from './request-item';

export declare interface MongoDBConfig {
  uri: string;
  [key: string]: unknown;
}

export declare type SQS_DATABASE_CONFIG = MongoDBConfig;

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

export declare interface SNSConfig {
  endpoint: string;
  db: DatabaseConfig;
  queueEndpoint?: string;
  queueSecretAccessKey?: string;
  queueAccessKey?: string;
  disableWorker?: boolean;
}

export declare interface SQNSConfig {
  endpoint: string;
  adminSecretKeys: Array<{ accessKey: string; secretAccessKey: string }>;
  db: DatabaseConfig;
  sqs?: { cronInterval?: string; disable?: boolean };
  sns?: {
    queueEndpoint?: string;
    queueSecretAccessKey?: string;
    queueAccessKey?: string;
    disable?: boolean;
    disableWorker?: boolean;
  };
}

export declare type ManagerQueueConfigListener = (queueName: string, nextItemListParams: KeyValue) => Promise<
  [KeyValue, Array<RequestItem>]>;

export declare interface ConfigCount { count: number; MAX_COUNT: number; }

export declare type QueueStorageToQueueConfigListener = (queues: Array<Queue>, nextItemListParams: KeyValue)
  => Promise<[KeyValue, boolean]>;
