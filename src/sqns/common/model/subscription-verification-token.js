"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionVerificationToken = void 0;
const base_object_1 = require("./base-object");
class SubscriptionVerificationToken extends base_object_1.BaseObject {
    constructor(item) {
        super(item);
        this.Type = item.Type;
        this.token = item.token;
        this.TopicArn = item.TopicArn;
        this.SubscriptionArn = item.SubscriptionArn;
    }
    getSubscribeURL(serverURL) {
        return `${serverURL}/sns?Action=${this.Type}&TopicArn=${this.TopicArn}&Token=${this.token}`;
    }
}
exports.SubscriptionVerificationToken = SubscriptionVerificationToken;
//# sourceMappingURL=subscription-verification-token.js.map