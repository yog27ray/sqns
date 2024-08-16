import { UserType } from '../../../../typings/class-types';
import { BaseObject } from '../../../client';

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
