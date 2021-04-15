export declare type ARN = string;
export declare type PHONE = string;
// export declare type SUPPORTED_BACKOFF_FUNCTIONS_TYPE = 'arithmetic' | 'geometric' | 'linear' | 'exponential';
export declare type SUPPORTED_BACKOFF_FUNCTIONS_TYPE = 'linear' | 'exponential';

// type SubscriptionProtocol = 'http' | 'https' | 'email' | 'sms' | 'sqs' | 'application';
export type SupportedProtocol = 'http' | 'https';

export declare type SUPPORTED_CHANNEL_TYPE = SupportedProtocol | 'default';
// <reference path="./index.d.ts" />

export declare interface KeyValue<T = unknown> { [key: string]: T; }

export declare interface KeyValueString { [key: string]: string; }

export declare type BASE_CONFIG = (() => KeyValue) | KeyValue;

export interface MessageAttributeValue {
  DataType: 'String';
  StringListValues?: Array<string>;
  StringValue?: string;
}

export interface MessageAttributeMap { [key: string]: MessageAttributeValue; }

export declare interface MessageAttributeEntry { Name: string; Value: MessageAttributeValue; }

export declare interface MessageAttributes { entry: Array<MessageAttributeEntry>; }

export interface Tag {
  Key: string;
  Value: string;
}

export interface Topic {
  TopicArn?: ARN;
}
