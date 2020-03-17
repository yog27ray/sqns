"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MSError extends Error {
    constructor(error) {
        super(error.message);
        Object.setPrototypeOf(this, MSError.prototype);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, MSError);
        }
        this.code = error.code;
    }
}
exports.MSError = MSError;
//# sourceMappingURL=m-s-error.js.map