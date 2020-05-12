"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
var EventState;
(function (EventState) {
    EventState["SUCCESS"] = "SUCCESS";
    EventState["FAILURE"] = "FAILURE";
    EventState["PENDING"] = "PENDING";
    EventState["PROCESSING"] = "PROCESSING";
})(EventState || (EventState = {}));
exports.EventState = EventState;
class EventItem {
    constructor(item) {
        this.createdAt = new Date();
        this.eventTime = new Date();
        this.state = EventState.PENDING;
        this.id = item.id || uuid_1.v4();
        this.type = item.type;
        this.data = item.data || {};
        this.priority = item.priority || EventItem.PRIORITY.DEFAULT;
        this.createdAt = item.createdAt || this.createdAt;
        this.eventTime = item.eventTime || this.eventTime;
        this.state = item.state || this.state;
    }
    createResponse() {
        return { id: this.id, priority: this.priority, type: this.type };
    }
    toRequestBody() {
        const json = {};
        Object.getOwnPropertyNames(this)
            .filter((property) => !['createdAt', 'eventTime'].includes(property))
            .forEach((property) => json[property] = this[property]);
        return json;
    }
    toJSON() {
        const json = {};
        Object.getOwnPropertyNames(this).forEach((property) => json[property] = this[property]);
        return json;
    }
}
exports.EventItem = EventItem;
EventItem.State = EventState;
EventItem.PRIORITY = { DEFAULT: 999999 };
//# sourceMappingURL=event-item.js.map