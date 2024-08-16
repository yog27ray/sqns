import { KeyValue, MessageAttributeMap, MessageAttributeValue } from '../src/client';

export declare interface ResponseMessage {
  MessageId: string;
  ReceiptHandle: string;
  MD5OfBody: string;
  Body: string;
  MessageAttribute?: Array<{ Name: string; Value: MessageAttributeValue; }>;
  Attribute?: Array<{ Name: string; Value: MessageAttributeValue; }>;
  [key: string]: unknown;
}

export declare interface ResponseItem {
  MessageId?: string;

  ReceiptHandle?: string;

  MD5OfBody?: string;

  Body?: string;

  Attributes?: KeyValue;

  MD5OfMessageAttributes?: string;

  MessageAttributes?: MessageAttributeMap;
}
