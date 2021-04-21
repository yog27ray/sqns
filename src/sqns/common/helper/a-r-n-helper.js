"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARNHelper = void 0;
class ARNHelper {
    static findResourceClassOfARN(resourceARN) {
        if (new RegExp('^arn:sqns:sns:[a-zA-Z0-9]*:[a-zA-Z0-9]*:[a-zA-Z0-9_]*$').exec(resourceARN)) {
            return 'Topic';
        }
        return undefined;
    }
}
exports.ARNHelper = ARNHelper;
//# sourceMappingURL=a-r-n-helper.js.map