import { SubscriptionVerificationTokenType } from '../../../../typings/class-types';
import { BaseObject } from './base-object';
declare class SubscriptionVerificationToken extends BaseObject {
    Type: string;
    token: string;
    TopicArn: string;
    SubscriptionArn: string;
    constructor(item: SubscriptionVerificationTokenType);
    getSubscribeURL(serverURL: string): string;
}
export { SubscriptionVerificationToken };
