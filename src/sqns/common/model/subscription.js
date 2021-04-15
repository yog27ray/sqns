"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subscription = void 0;
const base_object_1 = require("./base-object");
class Subscription extends base_object_1.BaseObject {
    constructor(item) {
        super(item);
        this.confirmed = false;
        this.companyId = item.companyId;
        this.region = item.region;
        this.protocol = item.protocol;
        this.endPoint = item.endPoint;
        this.Attributes = item.Attributes;
        this.topicARN = item.topicARN;
        this.confirmed = item.confirmed || this.confirmed;
        this.arn = item.arn || this.getARN();
        this.DeliveryPolicy = item.DeliveryPolicy;
    }
    getARN() {
        return `${this.topicARN}:${this.id}`;
    }
    getUnSubscribeURL(serverURL) {
        return `${serverURL}/sns?Action=Unsubscribe&SubscriptionArn=${this.arn}`;
    }
}
exports.Subscription = Subscription;
//# sourceMappingURL=subscription.js.map