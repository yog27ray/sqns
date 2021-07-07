import { SupportedProtocol, SUPPORTED_BACKOFF_FUNCTIONS_TYPE, SUPPORTED_CHANNEL_TYPE } from '../../../../typings/common';
declare const SUPPORTED_PROTOCOL: Array<SupportedProtocol>;
declare const SUPPORTED_CHANNEL: Array<SUPPORTED_CHANNEL_TYPE>;
declare const SUPPORTED_BACKOFF_FUNCTIONS: Array<SUPPORTED_BACKOFF_FUNCTIONS_TYPE>;
declare const SYSTEM_QUEUE_NAME: {
    SNS: string;
};
declare const SNS_QUEUE_EVENT_TYPES: {
    ScanSubscriptions: 'ScanSubscriptions';
    ProcessSubscription: 'ProcessSubscription';
};
declare const RESERVED_QUEUE_NAME: Array<string>;
export { SUPPORTED_CHANNEL, SUPPORTED_PROTOCOL, SUPPORTED_BACKOFF_FUNCTIONS, RESERVED_QUEUE_NAME, SYSTEM_QUEUE_NAME, SNS_QUEUE_EVENT_TYPES, };
