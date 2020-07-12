declare interface QueueType {
  id: string;
  name: string;
  attributes: any;
  tags: any;
  createdAt?: Date;
  updatedAt?: Date;
}

class Queue {
  id: string;

  name: string;

  attributes: any;

  tags: any;

  createdAt: Date = new Date();

  updatedAt: Date;

  constructor(item: QueueType) {
    this.id = item.id;
    this.name = item.name;
    this.attributes = item.attributes || {};
    this.tags = item.tags || {};
    this.createdAt = item.createdAt || this.createdAt;
    this.createdAt = item.updatedAt || this.createdAt;
  }

  toJSON(): { [key: string]: any } {
    const json = {};
    Object.getOwnPropertyNames(this).forEach((property: string) => json[property] = this[property]);
    return json;
  }

  clone(): Queue {
    const queueJSON = this.toJSON() as QueueType;
    return new Queue(queueJSON);
  }

  getExponentialFactor(): number {
    return Number(this.attributes.visibilityTimeoutExponentialFactor || '1');
  }

  calculateNewEventTime(time: Date, exponentialPower: number, delayInSeconds: number): Date {
    const delayTime = (this.getExponentialFactor() ** exponentialPower) * delayInSeconds * 1000;
    return new Date(time.getTime() + delayTime);
  }

  getMaxReceiveCount(): number {
    return Math.max(Number(this.attributes.maxReceiveCount || '3'), 1);
  }
}

export { Queue };
