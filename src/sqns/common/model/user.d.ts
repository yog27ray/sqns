import { UserType } from '../../../../typings/class-types';
import { BaseObject } from './base-object';
declare class User extends BaseObject {
    organizationId: string;
    constructor(item: UserType);
}
export { User };
