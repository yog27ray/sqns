import { BaseObject } from '@sqns-client';
import { SubscriptionVerificationTokenType } from '../../../../typings/class-types';

class SubscriptionVerificationToken extends BaseObject {
  Type: string;

  token: string;

  TopicArn: string;

  SubscriptionArn: string;

  constructor(item: SubscriptionVerificationTokenType) {
    super(item);
    this.Type = item.Type;
    this.token = item.token;
    this.TopicArn = item.TopicArn;
    this.SubscriptionArn = item.SubscriptionArn;
  }

  getSubscribeURL(serverURL: string): string {
    return `${serverURL}/sns?Action=${this.Type}&TopicArn=${this.TopicArn}&Token=${this.token}`;
  }
}

export { SubscriptionVerificationToken };
