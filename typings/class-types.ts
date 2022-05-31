import { EventState } from '../src/sqns/common/model/event-item';
import { ARN, MessageAttributeMap, MessageAttributes } from './common';
import { ChannelDeliveryPolicy, DeliveryPolicy } from './delivery-policy';
import { MessageStructure } from './publish';

export declare interface BaseObjectType {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export declare interface UserType extends BaseObjectType {
  organizationId: string;
  skipAuthentication?: boolean;
}

export declare interface AccessKeyType extends BaseObjectType {
  secretKey: string;
  accessKey: string;
  userId: string;
}

export declare interface EventItemType extends BaseObjectType {
  MessageBody: string;
  MessageAttribute?: MessageAttributeMap;
  MessageSystemAttribute?: MessageAttributeMap;
  queueARN?: ARN;
  MessageDeduplicationId?: string;
  data?: { [key: string]: any };
  receiveCount?: number;
  maxReceiveCount: number;
  priority: number;
  sentTime?: Date;
  firstSentTime?: Date;
  originalEventTime?: Date;
  eventTime?: Date;
  state?: EventState;
  DeliveryPolicy?: ChannelDeliveryPolicy;
}

export declare interface PublishType extends BaseObjectType {
  topicArn: ARN;
  targetArn: ARN;
  destinationArn?: ARN;
  Message: string;
  Status: string;
  PhoneNumber: string;
  Subject: string;
  MessageAttributes: MessageAttributes;
  MessageStructure: string;
  MessageStructureFinal: MessageStructure;
}

export declare interface QueueType extends BaseObjectType {
  ownerId: string;
  companyId: string;
  region: string;
  name: string;
  attributes: Record<string, string>;
  tags: Record<string, string>;
  arn?: ARN;
  DeliveryPolicy?: DeliveryPolicy;
}

export declare interface SubscriptionVerificationTokenType extends BaseObjectType {
  Type: string;
  token: string;
  TopicArn: string;
  SubscriptionArn: string;
}

export declare interface TopicTag { member: Array<{ key: string, value: string }>; }

export declare interface TopicAttributes { entry: Array<{ key: string, value: string }>; }

export declare interface TopicType extends BaseObjectType {
  name: string;
  companyId: string;
  region: string;
  displayName: string;
  arn?: string;
  deliveryPolicy: DeliveryPolicy;
  tags: TopicTag;
  attributes: TopicAttributes;
}
