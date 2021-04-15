import { SupportedProtocol } from '../../../../typings/typings';
import { ChannelDeliveryPolicy } from '../../../../typings/delivery-policy';
import { SubscriptionAttributes, SubscriptionType } from '../../../../typings/subscription';
import { BaseObject } from './base-object';
declare class Subscription extends BaseObject {
    companyId: string;
    protocol: SupportedProtocol;
    endPoint: string;
    region: string;
    topicARN: string;
    DeliveryPolicy: ChannelDeliveryPolicy;
    Attributes: SubscriptionAttributes;
    confirmed: boolean;
    arn: string;
    constructor(item: SubscriptionType);
    getARN(): string;
    getUnSubscribeURL(serverURL: string): string;
}
export { Subscription };
