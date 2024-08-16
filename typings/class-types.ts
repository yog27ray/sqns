import { ARN, BaseObjectType, DeliveryPolicy, MessageAttributes, MessageStructure } from '@sqns-client';

export declare interface UserType extends BaseObjectType {
  organizationId: string;
  skipAuthentication?: boolean;
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
