import { ARN, SQNSError, SQNSErrorType } from '@sqns-client';

class SQNSErrorCreator extends Error {
  code: string;

  detail?: string;

  static invalidQueueName(queueName: ARN): void {
    throw new SQNSError({
      code: 'NonExistentQueue',
      message: `The specified "${queueName.split(':').pop()}" queue does not exist.`,
    });
  }

  static invalidTopic(): void {
    throw new SQNSError({
      code: 'NotFound',
      message: 'Topic does not exist.',
    });
  }

  static invalidUser(): void {
    throw new SQNSError({
      code: 'NotFound',
      message: 'User does not exist.',
    });
  }

  static invalidAccessKey(): void {
    throw new SQNSError({
      code: 'NotFound',
      message: 'AccessKey does not exist.',
    });
  }

  static invalidSubscription(): void {
    throw new SQNSError({
      code: 'NotFound',
      message: 'Subscription does not exist.',
    });
  }

  static invalidPublish(): void {
    throw new SQNSError({
      code: 'NotFound',
      message: 'Publish does not exist.',
    });
  }

  static invalidToken(): void {
    throw new SQNSError({
      code: 'InvalidParameter',
      message: 'Invalid token',
    });
  }

  static invalidDeliveryPolicy(message: string): void {
    throw new SQNSError({ code: 'InvalidDeliveryPolicy', message });
  }

  static unhandledFunction(functionName: string): Promise<void> {
    throw new SQNSError({
      code: 'UnhandledFunction',
      message: `"${functionName}" function is not supported.`,
    });
  }

  static reservedQueueNames(): void {
    throw new SQNSError({
      code: 'ReservedQueueName',
      message: 'Reserved queue name',
    });
  }

  static invalidSubscriptionProtocol(protocol: string): void {
    throw new SQNSError({
      code: 'InvalidParameter',
      message: `Invalid parameter: Does not support this protocol string: ${protocol}`,
    });
  }

  static invalidSignatureError(): void {
    throw new SQNSError({
      code: 'SignatureDoesNotMatch',
      message: 'The request signature we calculated does not match the signature you provided.',
    });
  }

  static minAdminSecretKeys(): void {
    throw new SQNSError({
      code: 'MinAdminSecretKeys',
      message: 'At-least one admin secret keys must be provided',
    });
  }

  constructor(error: SQNSErrorType) {
    super(error.message);
    this.code = error.code;
    this.detail = error.detail;
  }
}

export { SQNSErrorCreator };
