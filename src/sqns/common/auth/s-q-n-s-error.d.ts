import { ARN } from '../../../../typings/common';
import { SQNSErrorType } from '../../../../typings/sqns-error-type';
declare class SQNSError extends Error {
    code: string;
    detail?: string;
    static invalidQueueName(queueName: ARN): void;
    static invalidTopic(): void;
    static invalidUser(): void;
    static invalidAccessKey(): void;
    static invalidSubscription(): void;
    static invalidPublish(): void;
    static invalidToken(): void;
    static invalidDeliveryPolicy(message: string): void;
    static unhandledFunction(functionName: string): Promise<void>;
    static reservedQueueNames(): void;
    static invalidSubscriptionProtocol(protocol: string): void;
    static invalidSignatureError(): void;
    static minAdminSecretKeys(): void;
    constructor(error: SQNSErrorType);
}
export { SQNSError };
