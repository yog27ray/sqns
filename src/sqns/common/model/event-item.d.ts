import { EventItemType } from '../../../../typings/class-types';
import { ARN, KeyValue, MessageAttributeMap } from '../../../../typings/common';
import { ChannelDeliveryPolicy } from '../../../../typings/delivery-policy';
import { BaseObject } from './base-object';
export declare enum EventState {
    SUCCESS = "SUCCESS",
    FAILURE = "FAILURE",
    PENDING = "PENDING",
    PROCESSING = "PROCESSING"
}
export declare class EventItem extends BaseObject {
    static State: typeof EventState;
    static PRIORITY: {
        DEFAULT: number;
    };
    queueARN: ARN;
    DeliveryPolicy: ChannelDeliveryPolicy;
    MessageDeduplicationId: string;
    MessageBody: string;
    MessageAttribute: MessageAttributeMap;
    MessageSystemAttribute: MessageAttributeMap;
    priority: number;
    receiveCount: number;
    maxReceiveCount: number;
    sentTime: Date;
    firstSentTime: Date;
    data: KeyValue;
    eventTime: Date;
    originalEventTime: Date;
    state: EventState;
    constructor(item: EventItemType);
    updateSentTime(date: Date): void;
    incrementReceiveCount(): void;
    setState(state: string): void;
    setDelaySeconds(DelaySeconds: number): void;
}
