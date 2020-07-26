declare interface AwsErrorType {
    message: string;
    code: string;
    detail?: string;
}
declare class AwsError extends Error {
    code: string;
    detail: string;
    static invalidQueueName(queueName: string): void;
    constructor(error: AwsErrorType);
}
export { AwsError };
