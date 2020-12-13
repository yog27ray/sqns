// <reference path="./index.d.ts" />

import { MessageAttributeMap } from './common';

type QueueAttributeName = 'All' | 'Policy' | 'VisibilityTimeout' | 'MaximumMessageSize'
  | 'MessageRetentionPeriod' | 'ApproximateNumberOfMessages' | 'ApproximateNumberOfMessagesNotVisible'
  | 'CreatedTimestamp' | 'LastModifiedTimestamp' | 'QueueArn' | 'ApproximateNumberOfMessagesDelayed'
  | 'DelaySeconds' | 'ReceiveMessageWaitTimeSeconds' | 'RedrivePolicy' | 'FifoQueue'
  | 'ContentBasedDeduplication' | 'KmsMasterKeyId' | 'KmsDataKeyReusePeriodSeconds' | string;

interface Message {
  MessageId?: string;
  ReceiptHandle?: string;
  MD5OfBody?: string;
  Body?: string;
  Attributes?: { [key: string]: string };
  MD5OfMessageAttributes?: string;
  MessageAttributes?: MessageAttributeMap;
}

export interface ReceiveMessageRequest {
  QueueUrl: string;
  AttributeNames?: Array<QueueAttributeName>;
  MessageAttributeNames?: Array<string>;
  MaxNumberOfMessages?: number;
  VisibilityTimeout?: number;
}

export interface ReceiveMessageResult {
  Messages?: Array<Message>;
}
