declare interface MSErrorType {
    message: string;
    code: number;
}
declare class MSError extends Error {
    private readonly code;
    constructor(error: MSErrorType);
}
export { MSError };
