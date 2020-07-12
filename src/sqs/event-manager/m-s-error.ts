declare interface MSErrorType {
  message: string;
  code: number;
}

class MSError extends Error {
  private readonly code: number;

  constructor(error: MSErrorType) {
    super(error.message);
    Object.setPrototypeOf(this, MSError.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MSError);
    }
    this.code = error.code;
  }
}

export { MSError };
