"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseObject = void 0;
class BaseObject {
    constructor(item) {
        this.id = item.id;
        this.createdAt = item.createdAt || new Date();
        this.updatedAt = item.updatedAt || this.createdAt;
    }
    toJSON() {
        const json = {};
        Object.getOwnPropertyNames(this).forEach((property) => {
            json[property] = this[property];
        });
        return json;
    }
}
exports.BaseObject = BaseObject;
//# sourceMappingURL=base-object.js.map