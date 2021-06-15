import { ChannelDeliveryPolicy, DeliveryPolicy } from '../../../../typings/delivery-policy';
import { GetSubscriptionResponse } from '../../../../typings/subscription';
import { KeyValue, SUPPORTED_BACKOFF_FUNCTIONS_TYPE } from '../../../../typings/typings';
import { SQNSError } from '../auth/s-q-n-s-error';
import { SUPPORTED_BACKOFF_FUNCTIONS } from './common';

export class DeliveryPolicyHelper {
  static readonly DEFAULT_DELIVERY_POLICY: DeliveryPolicy = {
    default: {
      defaultHealthyRetryPolicy: {
        numRetries: 3,
        numNoDelayRetries: 0,
        minDelayTarget: 20,
        maxDelayTarget: 20,
        numMinDelayRetries: 0,
        numMaxDelayRetries: 0,
        backoffFunction: 'exponential',
      },
      disableOverrides: false,
    },
  };

  private static readonly DELAY_CONFIG: { [key in SUPPORTED_BACKOFF_FUNCTIONS_TYPE]: number } = {
    linear: 1000 * 60 * 10,
    exponential: 2,
  };

  static calculateNewEventTime(
    startTime: Date,
    channelDeliveryPolicy: ChannelDeliveryPolicy,
    params: { minDelay: number; attempt: number }): Date {
    let timeDelay: number;
    switch (channelDeliveryPolicy.backoffFunction) {
      case 'linear': {
        timeDelay = DeliveryPolicyHelper.DELAY_CONFIG.linear;
        break;
      }
      case 'exponential': {
        timeDelay = (DeliveryPolicyHelper.DELAY_CONFIG.exponential ** params.attempt) * params.minDelay * 1000;
        break;
      }
      default: {
        throw new SQNSError({
          code: 'UnhandledBackoffFunction',
          message: 'Unhandled Backoff Function',
        });
      }
    }
    return new Date(startTime.getTime() + Math.max(timeDelay, params.minDelay));
  }

  static verifyAndGetChannelDeliveryPolicy(channelDeliveryPolicy?: string, replyWithDefaultPolicy?: boolean): ChannelDeliveryPolicy {
    try {
      DeliveryPolicyHelper.hasAllKeys(
        JSON.parse(channelDeliveryPolicy),
        DeliveryPolicyHelper.DEFAULT_DELIVERY_POLICY.default.defaultHealthyRetryPolicy as unknown as KeyValue);
      return JSON.parse(channelDeliveryPolicy) as ChannelDeliveryPolicy;
    } catch (error) {
      if (replyWithDefaultPolicy) {
        return DeliveryPolicyHelper.DEFAULT_DELIVERY_POLICY.default.defaultHealthyRetryPolicy;
      }
      if (channelDeliveryPolicy) {
        throw error;
      }
      return undefined;
    }
  }

  static getEffectiveChannelDeliveryPolicyForSubscription(deliveryPolicy: DeliveryPolicy, subscription: GetSubscriptionResponse)
    : ChannelDeliveryPolicy {
    const effectiveParentDeliveryPolicy = deliveryPolicy[subscription.Protocol] || deliveryPolicy.default;
    if (!subscription.Attributes.DeliveryPolicy) {
      return effectiveParentDeliveryPolicy.defaultHealthyRetryPolicy;
    }
    return effectiveParentDeliveryPolicy?.disableOverrides
      ? effectiveParentDeliveryPolicy.defaultHealthyRetryPolicy
      : JSON.parse(subscription.Attributes.DeliveryPolicy) as ChannelDeliveryPolicy;
  }

  static checkDeliveryPolicyCorrectness(deliveryPolicyStringValue?: string): void {
    let deliveryPolicy: DeliveryPolicy;
    try {
      if (!deliveryPolicyStringValue) {
        return;
      }
      deliveryPolicy = JSON.parse(deliveryPolicyStringValue);
    } catch (error) {
      SQNSError.invalidDeliveryPolicy(error.message);
    }
    DeliveryPolicyHelper.hasAllKeys(deliveryPolicy, DeliveryPolicyHelper.DEFAULT_DELIVERY_POLICY);
    const { backoffFunction } = deliveryPolicy.default.defaultHealthyRetryPolicy;
    if (!SUPPORTED_BACKOFF_FUNCTIONS.includes(backoffFunction)) {
      SQNSError.invalidDeliveryPolicy(`"${backoffFunction}" backoffFunction invalid.`);
    }
  }

  private static hasAllKeys(jsonOne: KeyValue, jsonTwo: KeyValue): void {
    const jsonOneKeys = Object.keys(jsonOne);
    const jsonTwoKeys = Object.keys(jsonTwo);
    if (jsonOneKeys.length !== jsonTwoKeys.length) {
      SQNSError.invalidDeliveryPolicy('Different keys');
    }
    jsonOneKeys.forEach((key: string) => {
      if (typeof jsonOne[key] === 'object' || typeof jsonTwo[key] === 'object') {
        this.hasAllKeys(jsonOne[key] as KeyValue, jsonTwo[key] as KeyValue);
        return;
      }
      if (!jsonTwoKeys.includes(key)) {
        SQNSError.invalidDeliveryPolicy(`"${key}" missing.`);
      }
    });
  }
}
