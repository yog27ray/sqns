import { ChannelDeliveryPolicy, DeliveryPolicy } from '../../../../typings/delivery-policy';
import { GetSubscriptionResponse } from '../../../../typings/subscription';
export declare class DeliveryPolicyHelper {
    static readonly DEFAULT_DELIVERY_POLICY: DeliveryPolicy;
    private static readonly DELAY_CONFIG;
    static calculateNewEventTime(startTime: Date, channelDeliveryPolicy: ChannelDeliveryPolicy, params: {
        minDelay: number;
        attempt: number;
    }): Date;
    static verifyAndGetChannelDeliveryPolicy(channelDeliveryPolicy: string, replyWithDefaultPolicy?: boolean): ChannelDeliveryPolicy;
    static getEffectiveChannelDeliveryPolicyForSubscription(deliveryPolicy: DeliveryPolicy, subscription: GetSubscriptionResponse): ChannelDeliveryPolicy;
    static checkDeliveryPolicyCorrectness(deliveryPolicyStringValue?: string): void;
    private static hasAllKeys;
}
