import { AccessKeyType } from '../../../../typings/class-types';
import { BaseObject } from './base-object';
export declare class AccessKey extends BaseObject {
    secretKey: string;
    accessKey: string;
    userId: string;
    constructor(item: AccessKeyType);
}
