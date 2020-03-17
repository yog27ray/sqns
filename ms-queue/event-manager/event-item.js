"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
class EventItem {
    constructor(item) {
        this.id = item.id || uuid_1.v4();
        this.type = item.type;
        this.data = item.data || {};
        this.priority = item.priority || EventItem.PRIORITY.DEFAULT;
        this.createdAt = new Date();
    }
    createResponse() {
        return { id: this.id, priority: this.priority, type: this.type };
    }
    toRequestBody() {
        return { id: this.id, priority: this.priority, type: this.type, data: this.data };
    }
}
exports.EventItem = EventItem;
EventItem.PRIORITY = { DEFAULT: 999999 };
//# sourceMappingURL=event-item.js.map