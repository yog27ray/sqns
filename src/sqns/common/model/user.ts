import { UserType } from '../../../../typings/class-types';
import { BaseObject } from './base-object';

class User extends BaseObject {
  organizationId: string;

  constructor(item: UserType) {
    super(item);
    this.organizationId = item.organizationId;
  }
}

export { User };
