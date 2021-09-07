import { EventState } from '../src/sqns/common/model/event-item';
import { ARN, MessageAttributeMap, PHONE, SUPPORTED_CHANNEL_TYPE } from './common';
export interface PublishInput {
    TopicArn?: ARN;
    TargetArn?: ARN;
    PhoneNumber?: PHONE;
    Message: string;
    Subject?: string;
    MessageStructure?: string;
    MessageAttributes?: MessageAttributeMap;
}
export interface GetPublishInput {
    MessageId: string;
}
export interface MarkPublishedInput {
    MessageId: string;
}
export interface FindMessageById {
    QueueUrl: string;
    MessageId: string;
}
export interface FindMessageByDeduplicationId {
    QueueUrl: string;
    MessageDeduplicationId: string;
}
export interface UpdateMessageById {
    QueueUrl: string;
    MessageId: string;
    DelaySeconds?: number;
    State?: EventState;
}
export interface UpdateMessageByDeduplicationId {
    QueueUrl: string;
    MessageDeduplicationId: string;
    DelaySeconds?: number;
    ReceiveCount?: number;
    State?: EventState;
}
export interface GetPublishResponse {
    MessageId: string;
    PublishArn?: ARN;
    Message?: string;
    PhoneNumber?: string;
    Subject?: string;
    Status?: string;
    MessageAttributes?: MessageAttributeMap;
}
export declare type MessageStructure = {
    [key in SUPPORTED_CHANNEL_TYPE]?: string;
};
export interface PublishResponse {
    MessageId?: string;
}
