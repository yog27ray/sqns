import { KeyValue, MessageAttributeMap } from './common';

export interface SendMessage {
  MessageBody: string;
  DelaySeconds?: number;
  MessageAttributes?: MessageAttributeMap;
  MessageSystemAttributes?: MessageAttributeMap;
  MessageDeduplicationId?: string;
}

export type SendMessageRequest = SendMessage & { QueueUrl: string };

export interface SendMessageReceived {
  MessageBody: string;
  DelaySeconds: string;
  MessageAttribute?: Array<KeyValue>;
  MessageSystemAttribute?: Array<KeyValue>;
  MessageDeduplicationId?: string;
}

export interface SendMessageResult {
  MD5OfMessageBody?: string;
  MD5OfMessageAttributes?: string;
  MD5OfMessageSystemAttributes?: string;
  MessageId?: string;
}

export interface SendMessageBatchRequest {
  QueueUrl: string;
  Entries: Array<SendMessage & { Id: string }>;
}

export interface BatchResultErrorEntry {
  Id: string;
  SenderFault: boolean;
  Code: string;
  Message?: string;
}

export interface SendMessageBatchResult {
  Successful: Array<SendMessageResult & { Id: string }>;
  Failed: Array<BatchResultErrorEntry>;
}
