import { ARN, MessageAttributeEntry, MessageAttributeMap, PHONE, SUPPORTED_CHANNEL_TYPE } from './common';

export interface PublishInput {
  TopicArn?: ARN;
  TargetArn?: ARN;
  PhoneNumber?: PHONE;
  Message: string;
  Subject?: string;
  MessageStructure?: string;
  MessageAttributes?: MessageAttributeMap;
}

export interface GetPublishInput { MessageId: string }
export interface MarkPublishedInput { MessageId: string }

export interface GetPublishResponse {
  MessageId: string;
  PublishArn?: ARN;
  Message?: string;
  PhoneNumber?: string;
  Subject?: string;
  Status?: string;
  MessageAttributes?: Array<MessageAttributeEntry>;
}

export declare type MessageStructure = { [key in SUPPORTED_CHANNEL_TYPE]?: string };

export interface PublishResponse { MessageId?: string }
