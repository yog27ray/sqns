import { v4 as uuid } from 'uuid';

enum EventState {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
}

class EventItem {
  static State = EventState;

  static PRIORITY: { DEFAULT: number } = { DEFAULT: 999999 };

  id: string;

  type: string;

  priority: number;

  createdAt: Date = new Date();

  data: object;

  eventTime: Date = new Date();

  state: EventState = EventState.PENDING;

  constructor(item: { type: string; data?: object; id?: string; priority?: number; eventTime?: Date; createdAt?: Date; state?: EventState }) {
    this.id = item.id || uuid();
    this.type = item.type;
    this.data = item.data || {};
    this.priority = item.priority || EventItem.PRIORITY.DEFAULT;
    this.createdAt = item.createdAt || this.createdAt;
    this.eventTime = item.eventTime || this.eventTime;
    this.state = item.state || this.state;
  }

  createResponse(): object {
    return { id: this.id, priority: this.priority, type: this.type };
  }

  toRequestBody(): object {
    const json = {};
    Object.getOwnPropertyNames(this)
      .filter((property: string) => !['createdAt', 'eventTime'].includes(property))
      .forEach((property: string) => json[property] = this[property]);
    return json;
  }

  toJSON(): object {
    const json = {};
    Object.getOwnPropertyNames(this).forEach((property: string) => json[property] = this[property]);
    return json;
  }
}

export { EventItem, EventState };
