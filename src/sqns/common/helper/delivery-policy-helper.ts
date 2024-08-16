import {
  ChannelDeliveryPolicy,
  DeliveryPolicy,
  GetSubscriptionResponse,
  KeyValue,
  SQNSError,
  SUPPORTED_BACKOFF_FUNCTIONS_TYPE,
} from '../../../client';
import { SQNSErrorCreator } from '../auth/s-q-n-s-error-creator';
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

  private static readonly DELAY_CONFIG: Partial<{ [key in SUPPORTED_BACKOFF_FUNCTIONS_TYPE]: number }> = {
    linear: 60 * 10,
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
        timeDelay = params.minDelay ** params.attempt;
        break;
      }
      default: {
        throw new SQNSError({
          code: 'UnhandledBackoffFunction',
          message: 'Unhandled Backoff Function',
        });
      }
    }
    const effectiveDelay = Math.min(
      channelDeliveryPolicy.maxDelayTarget,
      Math.max(timeDelay, params.minDelay, channelDeliveryPolicy.minDelayTarget)) * 1000;
    return new Date(startTime.getTime() + effectiveDelay);
  }

  static verifyAndGetChannelDeliveryPolicy(channelDeliveryPolicy: string, replyWithDefaultPolicy?: boolean): ChannelDeliveryPolicy {
    try {
      const channelDeliveryPolicyJSON = JSON.parse(channelDeliveryPolicy);
      DeliveryPolicyHelper.hasAllKeys(
        channelDeliveryPolicyJSON as Record<string, unknown>,
        DeliveryPolicyHelper.DEFAULT_DELIVERY_POLICY.default.defaultHealthyRetryPolicy as unknown as KeyValue);
      return channelDeliveryPolicyJSON as ChannelDeliveryPolicy;
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
    if (!subscription.Attributes?.DeliveryPolicy) {
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
      const { message } = error as { message: string; };
      SQNSErrorCreator.invalidDeliveryPolicy(message);
    }
    DeliveryPolicyHelper.hasAllKeys(deliveryPolicy, DeliveryPolicyHelper.DEFAULT_DELIVERY_POLICY);
    const { backoffFunction } = deliveryPolicy.default.defaultHealthyRetryPolicy;
    if (!SUPPORTED_BACKOFF_FUNCTIONS.includes(backoffFunction)) {
      SQNSErrorCreator.invalidDeliveryPolicy(`"${backoffFunction}" backoffFunction invalid.`);
    }
  }

  private static hasAllKeys(jsonOne: KeyValue, jsonTwo: KeyValue): void {
    const jsonOneKeys = Object.keys(jsonOne);
    const jsonTwoKeys = Object.keys(jsonTwo);
    if (jsonOneKeys.length !== jsonTwoKeys.length) {
      SQNSErrorCreator.invalidDeliveryPolicy('Different keys');
    }
    jsonOneKeys.forEach((key: string) => {
      if (typeof jsonOne[key] === 'object' || typeof jsonTwo[key] === 'object') {
        this.hasAllKeys(jsonOne[key] as KeyValue, jsonTwo[key] as KeyValue);
        return;
      }
      if (!jsonTwoKeys.includes(key)) {
        SQNSErrorCreator.invalidDeliveryPolicy(`"${key}" missing.`);
      }
    });
  }
}
