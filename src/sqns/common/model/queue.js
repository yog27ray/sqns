"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Queue = void 0;
const common_1 = require("../helper/common");
const delivery_policy_helper_1 = require("../helper/delivery-policy-helper");
const base_object_1 = require("./base-object");
class Queue extends base_object_1.BaseObject {
    constructor(item) {
        super(item);
        this.name = item.name;
        this.region = item.region;
        this.ownerId = item.ownerId;
        this.companyId = item.companyId;
        this.attributes = item.attributes || {};
        this.tags = item.tags || {};
        this.arn = item.arn || this.getARN();
        this.DeliveryPolicy = delivery_policy_helper_1.DeliveryPolicyHelper.verifyAndGetChannelDeliveryPolicy(this.attributes.DeliveryPolicy);
    }
    static arn(companyId, region, name) {
        if (common_1.RESERVED_QUEUE_NAME.includes(name)) {
            return `arn:sqns:sqs:${region}:sqns:${name}`;
        }
        return `arn:sqns:sqs:${region}:${companyId}:${name}`;
    }
    getMaxReceiveCount() {
        return Math.max(Number(this.attributes.maxReceiveCount || '3'), 1);
    }
    getARN() {
        return Queue.arn(this.companyId, this.region, this.name);
    }
}
exports.Queue = Queue;
//# sourceMappingURL=queue.js.map