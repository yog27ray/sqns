import { BaseObjectType } from './class-types';
import { ARN, SupportedProtocol } from './common';
import { ChannelDeliveryPolicy } from './delivery-policy';

interface Subscription {
  SubscriptionArn?: ARN;
  Owner?: string;
  Protocol?: SupportedProtocol;
  Endpoint?: string;
  TopicArn?: string;
}

export interface SubscribeInput {
  TopicArn: ARN;
  Protocol: SupportedProtocol;
  Endpoint?: string;
  Attributes?: { [key: string]: string };
  ReturnSubscriptionArn?: boolean;
}

export interface SubscribeResponse {
  SubscriptionArn?: ARN;
}

export interface ConfirmSubscriptionInput {
  TopicArn: ARN;
  Token: string;
}

export interface ConfirmSubscriptionResponse {
  SubscriptionArn?: ARN;
}

export interface SubscriptionConfirmationRequestBody {
  Type: string;
  MessageId: string;
  Token: string;
  TopicArn: ARN;
  Message: string;
  SubscribeURL: string;
  Timestamp: string;
}

export interface ListSubscriptionsByTopicInput {
  TopicArn: ARN;
  NextToken?: string;
}

export interface ListSubscriptionsInput {
  NextToken?: string;
}

export interface ListSubscriptionsByTopicResponse {
  Subscriptions?: Array<Subscription>;
  NextToken?: string;
}

export interface ListSubscriptionsResponse {
  Subscriptions?: Array<Subscription>;
  NextToken?: string;
}

export interface UnsubscribeInput {
  SubscriptionArn: string;
}

export interface GetSubscriptionInput { SubscriptionArn: ARN; }

export interface GetSubscriptionResponse {
  Protocol: SupportedProtocol;
  EndPoint: string;
  Attributes: { [key: string]: string };
  TopicARN: ARN;
  ARN: ARN;
  UnsubscribeUrl: string;
}

export declare interface SubscriptionAttributes { entry: Array<{ key: string, value: string }>; }

export declare interface SubscriptionType extends BaseObjectType {
  companyId: string;
  protocol: SupportedProtocol;
  endPoint: string;
  region: string;
  topicARN: string;
  confirmed: boolean;
  DeliveryPolicy: ChannelDeliveryPolicy;
  arn?: string;
  Attributes: SubscriptionAttributes;
}
