declare interface AwsErrorType {
  message: string;
  code: string;
  detail?: string;
}

class AwsError extends Error {
  code: string;

  detail: string;

  static invalidQueueName(queueName: string): void {
    throw new AwsError({
      code: 'NonExistentQueue',
      message: `The specified "${queueName}" queue does not exist.`,
    });
  }

  constructor(error: AwsErrorType) {
    super(error.message);
    this.code = error.code;
    this.detail = error.detail;
  }
}

export { AwsError };
