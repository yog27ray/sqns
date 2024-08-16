export declare interface SQNSErrorType {
  message: string;
  code: string;
  detail?: string;
}

export class SQNSError extends Error {
  code: string;

  detail?: string;

  constructor(error: SQNSErrorType) {
    super(error.message);
    this.code = error.code;
    this.detail = error.detail;
  }
}
