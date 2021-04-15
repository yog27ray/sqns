"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SNS_QUEUE_EVENT_TYPES = exports.SYSTEM_QUEUE_NAME = exports.RESERVED_QUEUE_NAME = exports.SUPPORTED_BACKOFF_FUNCTIONS = exports.SUPPORTED_PROTOCOL = exports.SUPPORTED_CHANNEL = void 0;
const SUPPORTED_PROTOCOL = ['http', 'https'];
exports.SUPPORTED_PROTOCOL = SUPPORTED_PROTOCOL;
const SUPPORTED_CHANNEL = ['http', 'https', 'default'];
exports.SUPPORTED_CHANNEL = SUPPORTED_CHANNEL;
const SUPPORTED_BACKOFF_FUNCTIONS = ['linear'];
exports.SUPPORTED_BACKOFF_FUNCTIONS = SUPPORTED_BACKOFF_FUNCTIONS;
const SYSTEM_QUEUE_NAME = { SNS: 'sqns_sns' };
exports.SYSTEM_QUEUE_NAME = SYSTEM_QUEUE_NAME;
const SNS_QUEUE_EVENT_TYPES = {
    ScanSubscriptions: 'ScanSubscriptions',
    ProcessSubscription: 'ProcessSubscription',
};
exports.SNS_QUEUE_EVENT_TYPES = SNS_QUEUE_EVENT_TYPES;
const RESERVED_QUEUE_NAME = [SYSTEM_QUEUE_NAME.SNS];
exports.RESERVED_QUEUE_NAME = RESERVED_QUEUE_NAME;
//# sourceMappingURL=common.js.map