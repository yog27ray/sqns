import { EventState } from '../model/event-item';
import { TopicAttributes, TopicTag } from './class-types';
import { MessageAttributes, MessageAttributeValue } from './common';
import { DeliveryPolicy } from './delivery-policy';
import { SendMessageJsonReceived, SendMessageReceived } from './send-message';

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
  Protocol: string;
  MessageAttributes: MessageAttributes;
  MessageStructure: string;
  SubscriptionArn: string;
  ReturnSubscriptionArn: boolean;
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

export interface SQSServerJSONBody {
  QueueName: string;
  ReceiveCount: number;
  MaxNumberOfMessages: string;
  VisibilityTimeout: string;
  QueueNamePrefix: string;
  AttributeName: Array<string>;
  MessageAttributeName: Array<string>;
  region: string;
  MessageId: string;
  ReturnSubscriptionArn: boolean;
  State: EventState.PENDING;
  MessageBody: string;
  DelaySeconds: string;
  MessageDeduplicationId: string;
  MessageSystemAttribute: Record<string, MessageAttributeValue>;
  MessageAttribute: Record<string, MessageAttributeValue>;
  SendMessageBatchRequestEntry: Array<SendMessageJsonReceived & { Id: string }>;
  Attribute: Record<string, string>;
  Tag: Record<string, string>;
  requestId: string;
  successMessage: string;
  failureMessage: string;
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
