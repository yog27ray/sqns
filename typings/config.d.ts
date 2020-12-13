// <reference path="./index.d.ts" />

import { ClientConfiguration } from '../../../../dist/src/sqs/request-response-types';
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

export declare interface SQSConfig {
  requestTasks?: Array<string>;
  config: SQS_DATABASE_CONFIG;
  cronInterval?: string;
  enableSNSQueue?: boolean;
}

export declare interface SNSConfig {
  config: SQS_DATABASE_CONFIG;
  sqsConfig?: SQSConfig;
  clientConfig: ClientConfiguration;
}

export declare type ManagerQueueConfigListener = (nextItemListParams: KeyValue) => Promise<[KeyValue, Array<RequestItem>]>;

declare type ConfigCount = { count: number, MAX_COUNT: number };

export declare type QueueStorageToQueueConfigListener = (queues: Array<Queue>, nextItemListParams: KeyValue)
  => Promise<[KeyValue, boolean]>;
