"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventState = exports.EventItem = void 0;
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
        this.priority = Number.MAX_SAFE_INTEGER;
        this.id = item.id;
        this.receiveCount = item.receiveCount || 0;
        this.queueId = item.queueId;
        this.maxReceiveCount = item.maxReceiveCount;
        this.data = item.data || {};
        this.MessageBody = item.MessageBody;
        if (item.MessageDeduplicationId) {
            this.MessageDeduplicationId = item.MessageDeduplicationId;
        }
        this.MessageAttribute = item.MessageAttribute || {};
        this.MessageSystemAttribute = item.MessageSystemAttribute || {};
        this.priority = item.priority || EventItem.PRIORITY.DEFAULT;
        this.state = item.state || EventState.PENDING;
        this.createdAt = item.createdAt || new Date();
        this.eventTime = item.eventTime;
        this.originalEventTime = item.originalEventTime || this.eventTime;
        this.sentTime = item.sentTime;
        this.firstSentTime = item.firstSentTime || this.sentTime;
        if (!this.id) {
            if (this.MessageDeduplicationId) {
                this.id = this.MessageDeduplicationId;
            }
            if (this.MessageAttribute.priority) {
                this.priority = Number(this.MessageAttribute.priority.StringValue);
            }
        }
    }
    toJSON() {
        const json = {};
        Object.getOwnPropertyNames(this).forEach((property) => {
            json[property] = this[property];
        });
        return json;
    }
    clone() {
        const queueJSON = this.toJSON();
        return new EventItem(queueJSON);
    }
    updateSentTime(date) {
        this.sentTime = date;
        if (!this.firstSentTime) {
            this.firstSentTime = this.sentTime;
        }
    }
    incrementReceiveCount() {
        this.receiveCount += 1;
    }
}
exports.EventItem = EventItem;
EventItem.State = EventState;
EventItem.PRIORITY = { DEFAULT: 999999 };
//# sourceMappingURL=event-item.js.map