import { AccessKeyType } from '../../../../typings/class-types';
import { BaseObject } from './base-object';

export class AccessKey extends BaseObject {
  secretKey: string;

  accessKey: string;

  userId: string;

  constructor(item: AccessKeyType) {
    super(item);
    this.accessKey = item.accessKey;
    this.secretKey = item.secretKey;
    this.userId = item.userId;
  }
}
