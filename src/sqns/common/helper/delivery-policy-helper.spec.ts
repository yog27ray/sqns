import { expect } from 'chai';
import { ChannelDeliveryPolicy, DeliveryPolicy } from '../../../../typings/delivery-policy';
import { GetSubscriptionResponse } from '../../../../typings/subscription';
import { DeliveryPolicyHelper } from './delivery-policy-helper';

describe('DeliveryPolicyHelper', () => {
  context('calculateNewEventTime', () => {
    it('should give error when backoffFunction is not supported', async () => {
      try {
        const channelDeliveryPolicy = { backoffFunction: 'unsupportedFunction' } as unknown as ChannelDeliveryPolicy;
        DeliveryPolicyHelper.calculateNewEventTime(new Date(), channelDeliveryPolicy, { minDelay: 1, attempt: 2 });
        await Promise.reject({ code: 99, message: 'should not reach here.' });
      } catch ({ code, message }) {
        expect({ code, message }).deep.equal({ code: 'UnhandledBackoffFunction', message: 'Unhandled Backoff Function' });
      }
    });
  });

  context('verifyAndGetChannelDeliveryPolicy', () => {
    it('should give error when delivery policy is not correct', async () => {
      try {
        DeliveryPolicyHelper.verifyAndGetChannelDeliveryPolicy('}{');
        await Promise.reject({ code: 99, message: 'should not reach here.' });
      } catch ({ code, message }) {
        expect({ code, message }).deep.equal({ code: undefined, message: 'Unexpected token } in JSON at position 0' });
      }
    });
  });

  context('getEffectiveChannelDeliveryPolicyForSubscription', () => {
    let deliveryPolicy: DeliveryPolicy;
    beforeEach(() => {
      deliveryPolicy = JSON.parse(JSON.stringify(DeliveryPolicyHelper.DEFAULT_DELIVERY_POLICY));
      deliveryPolicy.http = JSON.parse(JSON.stringify(DeliveryPolicyHelper.DEFAULT_DELIVERY_POLICY.default));
      Object.assign(deliveryPolicy.http.defaultHealthyRetryPolicy, { protocol: 'http' });
    });

    it('should return subscription DeliveryPolicy', async () => {
      const subscription = { Attributes: { DeliveryPolicy: '{"subscription": 1}' } } as unknown as GetSubscriptionResponse;
      const result = DeliveryPolicyHelper.getEffectiveChannelDeliveryPolicyForSubscription(deliveryPolicy, subscription);
      expect(result).to.deep.equal({ subscription: 1 });
    });

    it('should return subscription DeliveryPolicy when DeliveryPolicy has disableOverrides enabled and'
      + ' DeliveryPolicy has subscription protocol', async () => {
      const subscription = {
        Attributes: { DeliveryPolicy: '{"subscription": 1}' },
        Protocol: 'http',
      } as unknown as GetSubscriptionResponse;
      deliveryPolicy.http.disableOverrides = true;
      const result = DeliveryPolicyHelper.getEffectiveChannelDeliveryPolicyForSubscription(deliveryPolicy, subscription);
      expect(result).to.deep.equal({
        numRetries: 3,
        numNoDelayRetries: 0,
        minDelayTarget: 20,
        maxDelayTarget: 20,
        numMinDelayRetries: 0,
        numMaxDelayRetries: 0,
        protocol: 'http',
        backoffFunction: 'exponential',
      });
    });

    it('should return subscription DeliveryPolicy when DeliveryPolicy has disableOverrides disable and'
      + ' DeliveryPolicy has subscription protocol', async () => {
      const subscription = {
        Attributes: { DeliveryPolicy: '{"subscription": 1}' },
        Protocol: 'http',
      } as unknown as GetSubscriptionResponse;
      const result = DeliveryPolicyHelper.getEffectiveChannelDeliveryPolicyForSubscription(deliveryPolicy, subscription);
      expect(result).to.deep.equal({ subscription: 1 });
    });

    it('should return subscription DeliveryPolicy when DeliveryPolicy has disableOverrides enabled and'
      + ' DeliveryPolicy does\'t have subscription protocol', async () => {
      const subscription = {
        Attributes: { DeliveryPolicy: '{"subscription": 1}' },
        Protocol: 'https',
      } as unknown as GetSubscriptionResponse;
      deliveryPolicy.default.disableOverrides = true;
      const result = DeliveryPolicyHelper.getEffectiveChannelDeliveryPolicyForSubscription(deliveryPolicy, subscription);
      expect(result).to.deep.equal({
        numRetries: 3,
        numNoDelayRetries: 0,
        minDelayTarget: 20,
        maxDelayTarget: 20,
        numMinDelayRetries: 0,
        numMaxDelayRetries: 0,
        backoffFunction: 'exponential',
      });
    });

    it('should return subscription DeliveryPolicy when DeliveryPolicy has disableOverrides disabled and'
      + ' DeliveryPolicy does\'t have subscription protocol', async () => {
      const subscription = {
        Attributes: { DeliveryPolicy: '{"subscription": 1}' },
        Protocol: 'https',
      } as unknown as GetSubscriptionResponse;
      const result = DeliveryPolicyHelper.getEffectiveChannelDeliveryPolicyForSubscription(deliveryPolicy, subscription);
      expect(result).to.deep.equal({ subscription: 1 });
    });

    it('should return DeliveryPolicy protocol policy when subscription does\'t have DeliveryPolicy and protocol is present', async () => {
      const subscription = {
        Attributes: {},
        Protocol: 'http',
      } as unknown as GetSubscriptionResponse;
      const result = DeliveryPolicyHelper.getEffectiveChannelDeliveryPolicyForSubscription(deliveryPolicy, subscription);
      expect(result).to.deep.equal({
        numRetries: 3,
        numNoDelayRetries: 0,
        minDelayTarget: 20,
        maxDelayTarget: 20,
        numMinDelayRetries: 0,
        numMaxDelayRetries: 0,
        backoffFunction: 'exponential',
        protocol: 'http',
      });
    });

    it('should return DeliveryPolicy default policy when subscription does\'t have DeliveryPolicy and protocol is'
      + ' not present', async () => {
      const subscription = {
        Attributes: {},
        Protocol: 'https',
      } as unknown as GetSubscriptionResponse;
      const result = DeliveryPolicyHelper.getEffectiveChannelDeliveryPolicyForSubscription(deliveryPolicy, subscription);
      expect(result).to.deep.equal({
        numRetries: 3,
        numNoDelayRetries: 0,
        minDelayTarget: 20,
        maxDelayTarget: 20,
        numMinDelayRetries: 0,
        numMaxDelayRetries: 0,
        backoffFunction: 'exponential',
      });
    });
  });
});
