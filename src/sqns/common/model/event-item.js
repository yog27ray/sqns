"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventItem = exports.EventState = void 0;
const base_object_1 = require("./base-object");
var EventState;
(function (EventState) {
    EventState["SUCCESS"] = "SUCCESS";
    EventState["FAILURE"] = "FAILURE";
    EventState["PENDING"] = "PENDING";
    EventState["PROCESSING"] = "PROCESSING";
})(EventState = exports.EventState || (exports.EventState = {}));
class EventItem extends base_object_1.BaseObject {
    constructor(item) {
        super(item);
        this.priority = Number.MAX_SAFE_INTEGER;
        this.setReceiveCount(item.receiveCount || 0);
        this.queueARN = item.queueARN;
        this.maxReceiveCount = item.maxReceiveCount;
        this.data = item.data || {};
        this.MessageBody = item.MessageBody;
        if (item.MessageDeduplicationId) {
            this.MessageDeduplicationId = item.MessageDeduplicationId;
        }
        this.MessageAttribute = item.MessageAttribute || {};
        this.MessageSystemAttribute = item.MessageSystemAttribute || {};
        this.priority = isNaN(item.priority) ? EventItem.PRIORITY.DEFAULT : item.priority;
        this.state = item.state || EventState.PENDING;
        this.eventTime = item.eventTime;
        this.originalEventTime = item.originalEventTime || this.eventTime;
        this.sentTime = item.sentTime;
        this.firstSentTime = item.firstSentTime || this.sentTime;
        if (!this.id) {
            if (this.MessageAttribute.priority) {
                this.priority = Number(this.MessageAttribute.priority.StringValue);
            }
        }
        this.completionPending = item.completionPending || item.state !== EventState.SUCCESS;
        this.DeliveryPolicy = item.DeliveryPolicy;
    }
    updateSentTime(date) {
        this.sentTime = date;
        if (!this.firstSentTime) {
            this.firstSentTime = this.sentTime;
        }
    }
    incrementReceiveCount() {
        this.setReceiveCount(this.receiveCount + 1);
    }
    setState(state) {
        switch (state) {
            case EventState.PENDING.valueOf(): {
                this.state = EventState.PENDING;
                break;
            }
            case EventState.FAILURE.valueOf(): {
                this.state = EventState.FAILURE;
                break;
            }
            case EventState.SUCCESS.valueOf(): {
                this.state = EventState.SUCCESS;
                break;
            }
            case EventState.PROCESSING.valueOf(): {
                this.state = EventState.PROCESSING;
                break;
            }
            default:
        }
    }
    setDelaySeconds(DelaySeconds) {
        if (DelaySeconds === undefined) {
            return;
        }
        this.eventTime = new Date(new Date().getTime() + (Number(DelaySeconds) * 1000));
    }
    setReceiveCount(receiveCount) {
        if (receiveCount === undefined) {
            return;
        }
        this.receiveCount = Math.max(0, receiveCount);
        this.maxAttemptCompleted = this.receiveCount >= this.maxReceiveCount;
    }
}
exports.EventItem = EventItem;
EventItem.State = EventState;
EventItem.PRIORITY = { DEFAULT: 999999 };
//# sourceMappingURL=event-item.js.map