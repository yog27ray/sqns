"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const base_object_1 = require("./base-object");
class User extends base_object_1.BaseObject {
    constructor(item) {
        super(item);
        this.organizationId = item.organizationId;
        this.skipAuthentication = item.skipAuthentication;
    }
}
exports.User = User;
//# sourceMappingURL=user.js.map