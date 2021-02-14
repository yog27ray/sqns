import { SupportedProtocol } from '../../../../typings';
import { ChannelDeliveryPolicy } from '../../../../typings/delivery-policy';
import { SubscriptionAttributes, SubscriptionType } from '../../../../typings/subscription';
import { BaseObject } from './base-object';

class Subscription extends BaseObject {
  companyId: string;

  protocol: SupportedProtocol;

  endPoint: string;

  region: string;

  topicARN: string;

  DeliveryPolicy: ChannelDeliveryPolicy;

  Attributes: SubscriptionAttributes;

  confirmed: boolean = false;

  arn: string;

  constructor(item: SubscriptionType) {
    super(item);
    this.companyId = item.companyId;
    this.region = item.region;
    this.protocol = item.protocol;
    this.endPoint = item.endPoint;
    this.Attributes = item.Attributes;
    this.topicARN = item.topicARN;
    this.confirmed = item.confirmed || this.confirmed;
    this.arn = item.arn || this.getARN();
    this.DeliveryPolicy = item.DeliveryPolicy;
  }

  getARN(): string {
    return `${this.topicARN}:${this.id}`;
  }

  getUnSubscribeURL(serverURL: string): string {
    return `${serverURL}/sns?Action=Unsubscribe&SubscriptionArn=${this.arn}`;
  }
}

export { Subscription };
