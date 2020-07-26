"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsError = void 0;
class AwsError extends Error {
    constructor(error) {
        super(error.message);
        this.code = error.code;
        this.detail = error.detail;
    }
    static invalidQueueName(queueName) {
        throw new AwsError({
            code: 'NonExistentQueue',
            message: `The specified "${queueName}" queue does not exist.`,
        });
    }
}
exports.AwsError = AwsError;
//# sourceMappingURL=aws-error.js.map