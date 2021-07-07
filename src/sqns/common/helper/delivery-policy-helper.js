"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryPolicyHelper = void 0;
const s_q_n_s_error_1 = require("../auth/s-q-n-s-error");
const common_1 = require("./common");
class DeliveryPolicyHelper {
    static calculateNewEventTime(startTime, channelDeliveryPolicy, params) {
        let timeDelay;
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
                throw new s_q_n_s_error_1.SQNSError({
                    code: 'UnhandledBackoffFunction',
                    message: 'Unhandled Backoff Function',
                });
            }
        }
        const effectiveDelay = Math.min(channelDeliveryPolicy.maxDelayTarget, Math.max(timeDelay, params.minDelay, channelDeliveryPolicy.minDelayTarget)) * 1000;
        return new Date(startTime.getTime() + effectiveDelay);
    }
    static verifyAndGetChannelDeliveryPolicy(channelDeliveryPolicy, replyWithDefaultPolicy) {
        try {
            const channelDeliveryPolicyJSON = JSON.parse(channelDeliveryPolicy);
            DeliveryPolicyHelper.hasAllKeys(channelDeliveryPolicyJSON, DeliveryPolicyHelper.DEFAULT_DELIVERY_POLICY.default.defaultHealthyRetryPolicy);
            return channelDeliveryPolicyJSON;
        }
        catch (error) {
            if (replyWithDefaultPolicy) {
                return DeliveryPolicyHelper.DEFAULT_DELIVERY_POLICY.default.defaultHealthyRetryPolicy;
            }
            if (channelDeliveryPolicy) {
                throw error;
            }
            return undefined;
        }
    }
    static getEffectiveChannelDeliveryPolicyForSubscription(deliveryPolicy, subscription) {
        const effectiveParentDeliveryPolicy = deliveryPolicy[subscription.Protocol] || deliveryPolicy.default;
        if (!subscription.Attributes.DeliveryPolicy) {
            return effectiveParentDeliveryPolicy.defaultHealthyRetryPolicy;
        }
        return (effectiveParentDeliveryPolicy === null || effectiveParentDeliveryPolicy === void 0 ? void 0 : effectiveParentDeliveryPolicy.disableOverrides) ? effectiveParentDeliveryPolicy.defaultHealthyRetryPolicy
            : JSON.parse(subscription.Attributes.DeliveryPolicy);
    }
    static checkDeliveryPolicyCorrectness(deliveryPolicyStringValue) {
        let deliveryPolicy;
        try {
            if (!deliveryPolicyStringValue) {
                return;
            }
            deliveryPolicy = JSON.parse(deliveryPolicyStringValue);
        }
        catch (error) {
            s_q_n_s_error_1.SQNSError.invalidDeliveryPolicy(error.message);
        }
        DeliveryPolicyHelper.hasAllKeys(deliveryPolicy, DeliveryPolicyHelper.DEFAULT_DELIVERY_POLICY);
        const { backoffFunction } = deliveryPolicy.default.defaultHealthyRetryPolicy;
        if (!common_1.SUPPORTED_BACKOFF_FUNCTIONS.includes(backoffFunction)) {
            s_q_n_s_error_1.SQNSError.invalidDeliveryPolicy(`"${backoffFunction}" backoffFunction invalid.`);
        }
    }
    static hasAllKeys(jsonOne, jsonTwo) {
        const jsonOneKeys = Object.keys(jsonOne);
        const jsonTwoKeys = Object.keys(jsonTwo);
        if (jsonOneKeys.length !== jsonTwoKeys.length) {
            s_q_n_s_error_1.SQNSError.invalidDeliveryPolicy('Different keys');
        }
        jsonOneKeys.forEach((key) => {
            if (typeof jsonOne[key] === 'object' || typeof jsonTwo[key] === 'object') {
                this.hasAllKeys(jsonOne[key], jsonTwo[key]);
                return;
            }
            if (!jsonTwoKeys.includes(key)) {
                s_q_n_s_error_1.SQNSError.invalidDeliveryPolicy(`"${key}" missing.`);
            }
        });
    }
}
exports.DeliveryPolicyHelper = DeliveryPolicyHelper;
DeliveryPolicyHelper.DEFAULT_DELIVERY_POLICY = {
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
DeliveryPolicyHelper.DELAY_CONFIG = {
    linear: 60 * 10,
};
//# sourceMappingURL=delivery-policy-helper.js.map