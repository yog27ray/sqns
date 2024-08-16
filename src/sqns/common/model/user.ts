import { BaseObject } from '@sqns-client';
import { UserType } from '../../../../typings/class-types';

class User extends BaseObject {
  organizationId: string;

  skipAuthentication: boolean;

  constructor(item: UserType) {
    super(item);
    this.organizationId = item.organizationId;
    this.skipAuthentication = item.skipAuthentication;
  }
}

export { User };
