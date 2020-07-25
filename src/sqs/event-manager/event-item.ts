enum EventState {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
}

declare interface EventItemType {
  MessageBody: string;
  MessageAttribute?: { [key: string]: { DataType: string; StringValue: any } };
  MessageSystemAttribute?: { [key: string]: { DataType: string; StringValue: any } };
  queueId?: string;
  MessageDeduplicationId?: string;
  data?: { [key: string]: any };
  receiveCount?: number;
  maxReceiveCount: number;
  id?: string;
  priority?: number;
  sentTime?: Date;
  firstSentTime?: Date;
  originalEventTime?: Date;
  eventTime?: Date;
  createdAt?: Date;
  state?: EventState;
}

class EventItem {
  static State = EventState;

  static PRIORITY: { DEFAULT: number } = { DEFAULT: 999999 };

  id: string;

  queueId: string;

  MessageDeduplicationId: string;

  MessageBody: string;

  MessageAttribute: { [key: string]: { DataType: string; StringValue: any } };

  MessageSystemAttribute: { [key: string]: { DataType: string; StringValue: any } };

  priority: number = Number.MAX_SAFE_INTEGER;

  receiveCount: number;

  maxReceiveCount: number;

  createdAt: Date;

  sentTime: Date;

  firstSentTime: Date;

  data: { [key: string]: any };

  eventTime: Date;

  originalEventTime: Date;

  state: EventState;

  constructor(item: EventItemType) {
    this.id = item.id;
    this.receiveCount = item.receiveCount || 0;
    this.queueId = item.queueId;
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

    this.createdAt = item.createdAt || new Date();
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
  }

  toJSON(): { [key: string]: any } {
    const json = {};
    Object.getOwnPropertyNames(this).forEach((property: string) => {
      json[property] = this[property];
    });
    return json;
  }

  clone(): EventItem {
    const queueJSON = this.toJSON() as EventItemType;
    return new EventItem(queueJSON);
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

export { EventItem, EventState };
