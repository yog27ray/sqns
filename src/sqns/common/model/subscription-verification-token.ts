import { SubscriptionVerificationTokenType } from '../../../../typings/class-types';
import { BaseObject } from '../../../client';

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
    return `${serverURL}/v1/sns/subscriptions/confirm?TopicArn=${this.TopicArn}&Token=${this.token}`;
  }
}

export { SubscriptionVerificationToken };
