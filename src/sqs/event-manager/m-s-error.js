"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MSError = void 0;
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