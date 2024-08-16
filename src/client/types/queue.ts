import { EventState } from '../model/event-item';
import { TopicAttributes, TopicTag } from './class-types';
import { MessageAttributes } from './common';
import { DeliveryPolicy } from './delivery-policy';
import { SendMessageReceived } from './send-message';

export interface CreateQueueRequest {
  QueueName: string;
  Attributes?: Record<string, string>;
  tags?: Record<string, string>;
}

export interface SNSServerBody {
  deliveryPolicy: DeliveryPolicy;
  requestId: string;
  Attributes: TopicAttributes;
  Tags: TopicTag;
  Token: string;
  AttributeValue: string;
  AttributeName: string;
  MessageId: string;
  NextToken: string;
  TopicArn: string;
  region: string;
  displayName: string;
  Name: string;
  Action: string;
  TargetArn: string;
  Message: string;
  PhoneNumber: string;
  Subject: string;
  Endpoint: string;
  ReturnSubscriptionArn: boolean;
  Protocol: string;
  MessageAttributes: MessageAttributes;
  MessageStructure: string;
  SubscriptionArn: string;
}

export interface SQSServerBody {
  QueueName: string;
  queueName: string;
  ReceiveCount: number;
  MaxNumberOfMessages: string;
  VisibilityTimeout: string;
  QueueNamePrefix: string;
  AttributeName: Array<string>;
  MessageAttributeName: Array<string>;
  region: string;
  MessageId: string;
  State: EventState.PENDING;
  MessageBody: string;
  DelaySeconds: string;
  MessageDeduplicationId: string;
  MessageSystemAttribute: Array<{ Name: string; Value: string; }>;
  MessageAttribute: Array<{ Name: string; Value: string; }>;
  SendMessageBatchRequestEntry: Array<SendMessageReceived & { Id: string }>;
  Attribute: Array<{ Name: string; Value: string; }>;
  Tag: Array<{ Name: string; Value: string; }>;
  requestId: string;
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
