"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQNSError = void 0;
class SQNSError extends Error {
    constructor(error) {
        super(error.message);
        this.code = error.code;
        this.detail = error.detail;
    }
    static invalidQueueName(queueName) {
        throw new SQNSError({
            code: 'NonExistentQueue',
            message: `The specified "${queueName.split(':').pop()}" queue does not exist.`,
        });
    }
    static invalidTopic() {
        throw new SQNSError({
            code: 'NotFound',
            message: 'Topic does not exist.',
        });
    }
    static invalidUser() {
        throw new SQNSError({
            code: 'NotFound',
            message: 'User does not exist.',
        });
    }
    static invalidAccessKey() {
        throw new SQNSError({
            code: 'NotFound',
            message: 'AccessKey does not exist.',
        });
    }
    static invalidSubscription() {
        throw new SQNSError({
            code: 'NotFound',
            message: 'Subscription does not exist.',
        });
    }
    static invalidPublish() {
        throw new SQNSError({
            code: 'NotFound',
            message: 'Publish does not exist.',
        });
    }
    static invalidToken() {
        throw new SQNSError({
            code: 'InvalidParameter',
            message: 'Invalid token',
        });
    }
    static invalidDeliveryPolicy(message) {
        throw new SQNSError({ code: 'InvalidDeliveryPolicy', message });
    }
    static unhandledFunction(functionName) {
        throw new SQNSError({
            code: 'UnhandledFunction',
            message: `"${functionName}" function is not supported.`,
        });
    }
    static reservedQueueNames() {
        throw new SQNSError({
            code: 'ReservedQueueName',
            message: 'Reserved queue name',
        });
    }
    static invalidSubscriptionProtocol(protocol) {
        throw new SQNSError({
            code: 'InvalidParameter',
            message: `Invalid parameter: Does not support this protocol string: ${protocol}`,
        });
    }
    static invalidSignatureError() {
        throw new SQNSError({
            code: 'SignatureDoesNotMatch',
            message: 'The request signature we calculated does not match the signature you provided.',
        });
    }
    static minAdminSecretKeys() {
        throw new SQNSError({
            code: 'MinAdminSecretKeys',
            message: 'At-least one admin secret keys must be provided',
        });
    }
}
exports.SQNSError = SQNSError;
//# sourceMappingURL=s-q-n-s-error.js.map