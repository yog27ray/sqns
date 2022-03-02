import { BaseObjectType } from '../../../../typings/class-types';

class BaseObject {
  id: string;

  createdAt?: Date;

  updatedAt?: Date;

  constructor(item: BaseObjectType) {
    this.id = item.id;
    this.createdAt = item.createdAt || new Date();
    this.updatedAt = item.updatedAt || this.createdAt;
  }

  toJSON(): Record<string, unknown> {
    const json = {};
    Object.getOwnPropertyNames(this).forEach((property: string) => {
      json[property] = this[property];
    });
    return json;
  }
}

export { BaseObject };
