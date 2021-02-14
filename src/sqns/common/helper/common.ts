import { SupportedProtocol, SUPPORTED_BACKOFF_FUNCTIONS_TYPE, SUPPORTED_CHANNEL_TYPE } from '../../../../typings';

const SUPPORTED_PROTOCOL: Array<SupportedProtocol> = ['http', 'https'];
const SUPPORTED_CHANNEL: Array<SUPPORTED_CHANNEL_TYPE> = ['http', 'https', 'default'];
const SUPPORTED_BACKOFF_FUNCTIONS: Array<SUPPORTED_BACKOFF_FUNCTIONS_TYPE> = ['linear'];
const SYSTEM_QUEUE_NAME: { SNS: string } = { SNS: 'sqns_sns' };
const SNS_QUEUE_EVENT_TYPES: {
  ScanSubscriptions: 'ScanSubscriptions';
  ProcessSubscription: 'ProcessSubscription'
} = {
  ScanSubscriptions: 'ScanSubscriptions',
  ProcessSubscription: 'ProcessSubscription',
};
const RESERVED_QUEUE_NAME: Array<string> = [SYSTEM_QUEUE_NAME.SNS];

export {
  SUPPORTED_CHANNEL,
  SUPPORTED_PROTOCOL,
  SUPPORTED_BACKOFF_FUNCTIONS,
  RESERVED_QUEUE_NAME,
  SYSTEM_QUEUE_NAME,
  SNS_QUEUE_EVENT_TYPES,
};
