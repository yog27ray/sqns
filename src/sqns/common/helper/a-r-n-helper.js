"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARNHelper = void 0;
class ARNHelper {
    static findResourceClassOfARN(resourceARN) {
        if (/^arn:sqns:sns:[a-zA-Z0-9]*:[a-zA-Z0-9]*:[a-zA-Z0-9]*$/.exec(resourceARN)) {
            return 'Topic';
        }
        return undefined;
    }
}
exports.ARNHelper = ARNHelper;
//# sourceMappingURL=a-r-n-helper.js.map