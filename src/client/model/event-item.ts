import { EventItemType } from '../types/class-types';
import { ARN, KeyValue, MessageAttributeMap } from '../types/common';
import { ChannelDeliveryPolicy } from '../types/delivery-policy';
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

  maxAttemptCompleted: boolean;

  completionPending: boolean;

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
    this.maxReceiveCount = item.maxReceiveCount;
    this.setReceiveCount(item.receiveCount);
    this.queueARN = item.queueARN;
    this.data = item.data || {};
    this.MessageBody = item.MessageBody;
    if (item.MessageDeduplicationId) {
      this.MessageDeduplicationId = item.MessageDeduplicationId;
    }
    this.MessageAttribute = item.MessageAttribute || {};
    this.MessageSystemAttribute = item.MessageSystemAttribute || {};
    this.priority = isNaN(item.priority) ? EventItem.PRIORITY.DEFAULT : item.priority;
    this.setState(item.state);
    this.eventTime = item.eventTime;
    this.originalEventTime = item.originalEventTime || this.eventTime;
    this.sentTime = item.sentTime;
    this.firstSentTime = item.firstSentTime || this.sentTime;
    if (!this.id) {
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
    this.setReceiveCount(this.receiveCount + 1);
  }

  setState(state: EventState = EventState.PENDING): void {
    if (this.state && EventState.SUCCESS !== state) {
      this.setReceiveCount(0);
    }
    switch (state) {
      case EventState.PENDING: {
        this.state = EventState.PENDING;
        break;
      }
      case EventState.FAILURE: {
        this.state = EventState.FAILURE;
        break;
      }
      case EventState.SUCCESS: {
        this.state = EventState.SUCCESS;
        break;
      }
      case EventState.PROCESSING: {
        this.state = EventState.PROCESSING;
        break;
      }
      default:
    }
    this.completionPending = this.state !== EventState.SUCCESS;
  }

  setDelaySeconds(DelaySeconds: string): void {
    if (DelaySeconds === undefined) {
      return;
    }
    this.eventTime = new Date(new Date().getTime() + (Number(DelaySeconds) * 1000));
  }

  setReceiveCount(receiveCount: number = 0): void {
    if (receiveCount === undefined) {
      return;
    }
    this.receiveCount = Math.max(0, receiveCount);
    this.maxAttemptCompleted = this.receiveCount >= this.maxReceiveCount;
  }
}
