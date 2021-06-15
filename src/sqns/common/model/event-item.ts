import { EventItemType } from '../../../../typings/class-types';
import { ARN, KeyValue, MessageAttributeMap } from '../../../../typings/common';
import { ChannelDeliveryPolicy } from '../../../../typings/delivery-policy';
import { BaseObject } from './base-object';

export enum EventState {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
}

export class EventItem extends BaseObject {
  static State = EventState;

  static PRIORITY: { DEFAULT: number } = { DEFAULT: 999999 };

  queueARN: ARN;

  DeliveryPolicy: ChannelDeliveryPolicy;

  MessageDeduplicationId: string;

  MessageBody: string;

  MessageAttribute: MessageAttributeMap;

  MessageSystemAttribute: MessageAttributeMap;

  priority: number = Number.MAX_SAFE_INTEGER;

  receiveCount: number;

  maxReceiveCount: number;

  sentTime: Date;

  firstSentTime: Date;

  data: KeyValue;

  eventTime: Date;

  originalEventTime: Date;

  state: EventState;

  constructor(item: EventItemType) {
    super(item);
    this.receiveCount = item.receiveCount || 0;
    this.queueARN = item.queueARN;
    this.maxReceiveCount = item.maxReceiveCount;
    this.data = item.data || {};
    this.MessageBody = item.MessageBody;
    if (item.MessageDeduplicationId) {
      this.MessageDeduplicationId = item.MessageDeduplicationId;
    }
    this.MessageAttribute = item.MessageAttribute || {};
    this.MessageSystemAttribute = item.MessageSystemAttribute || {};
    this.priority = item.priority || EventItem.PRIORITY.DEFAULT;
    this.state = item.state || EventState.PENDING;

    this.eventTime = item.eventTime;
    this.originalEventTime = item.originalEventTime || this.eventTime;
    this.sentTime = item.sentTime;
    this.firstSentTime = item.firstSentTime || this.sentTime;
    if (!this.id) {
      if (this.MessageDeduplicationId) {
        this.id = this.MessageDeduplicationId;
      }
      if (this.MessageAttribute.priority) {
        this.priority = Number(this.MessageAttribute.priority.StringValue);
      }
    }
    this.DeliveryPolicy = item.DeliveryPolicy;
  }

  updateSentTime(date: Date): void {
    this.sentTime = date;
    if (!this.firstSentTime) {
      this.firstSentTime = this.sentTime;
    }
  }

  incrementReceiveCount(): void {
    this.receiveCount += 1;
  }
}
