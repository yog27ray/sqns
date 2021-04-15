// <reference path="./index.d.ts" />

export interface CreateQueueRequest {
  QueueName: string;
  Attributes?: { [key: string]: string };
  tags?: { [key: string]: string };
}

export interface CreateQueueResult {
  QueueUrl?: string;
}

export interface GetQueueUrlRequest {
  QueueName: string;
}

export interface GetQueueUrlResult {
  QueueUrl?: string;
}

export interface DeleteQueueRequest {
  QueueUrl: string;
}
