"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessKey = void 0;
const base_object_1 = require("./base-object");
class AccessKey extends base_object_1.BaseObject {
    constructor(item) {
        super(item);
        this.accessKey = item.accessKey;
        this.secretKey = item.secretKey;
        this.userId = item.userId;
    }
}
exports.AccessKey = AccessKey;
//# sourceMappingURL=access-key.js.map