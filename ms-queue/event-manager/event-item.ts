import { v4 as uuid } from 'uuid';

class EventItem {
  static PRIORITY: { DEFAULT: number } = { DEFAULT: 999999 };

  id: string;

  type: string;

  priority: number;

  createdAt: Date;

  data: object;

  constructor(item: { type: string; data?: object; id?: string; priority?: number }) {
    this.id = item.id || uuid();
    this.type = item.type;
    this.data = item.data || {};
    this.priority = item.priority || EventItem.PRIORITY.DEFAULT;
    this.createdAt = new Date();
  }

  createResponse(): object {
    return { id: this.id, priority: this.priority, type: this.type };
  }

  toRequestBody(): object {
    return { id: this.id, priority: this.priority, type: this.type, data: this.data };
  }
}

export { EventItem };
