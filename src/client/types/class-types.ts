import { EventState } from '../model/event-item';
import { ARN, MessageAttributeMap } from './common';
import { ChannelDeliveryPolicy, DeliveryPolicy } from './delivery-policy';

export declare interface TopicTag { member: Array<{ key: string, value: string }>; }

export declare interface TopicAttributes { entry: Array<{ key: string, value: string }>; }

export declare interface BaseObjectType {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
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
