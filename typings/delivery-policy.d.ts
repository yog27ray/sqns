import { SUPPORTED_BACKOFF_FUNCTIONS_TYPE, SUPPORTED_CHANNEL_TYPE } from './common';
export declare interface ChannelDeliveryPolicy {
    numRetries: number;
    numNoDelayRetries: number;
    minDelayTarget: number;
    maxDelayTarget: number;
    numMinDelayRetries: number;
    numMaxDelayRetries: number;
    backoffFunction: SUPPORTED_BACKOFF_FUNCTIONS_TYPE;
}
export type DeliveryPolicy = {
    [key in SUPPORTED_CHANNEL_TYPE]?: {
        defaultHealthyRetryPolicy: ChannelDeliveryPolicy;
        disableOverrides: boolean;
    };
};
