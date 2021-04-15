"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Topic = void 0;
const base_object_1 = require("./base-object");
class Topic extends base_object_1.BaseObject {
    constructor(item) {
        super(item);
        this.name = item.name;
        this.region = item.region;
        this.companyId = item.companyId;
        this.displayName = item.displayName;
        this.deliveryPolicy = item.deliveryPolicy;
        this.tags = item.tags;
        this.attributes = item.attributes;
        this.arn = item.arn || this.getARN();
    }
    updateAttributes(AttributeName, AttributeValue) {
        const attributeEntry = this.attributes.entry.filter(({ key }) => (key === AttributeName))[0];
        if (attributeEntry) {
            attributeEntry.value = AttributeValue;
            return;
        }
        this.attributes.entry.push({ key: AttributeName, value: AttributeValue });
    }
    toJSON() {
        const json = {};
        Object.getOwnPropertyNames(this).forEach((property) => {
            json[property] = this[property];
        });
        return json;
    }
    getARN() {
        return `arn:sqns:sns:${this.region}:${this.companyId}:${this.name}`;
    }
}
exports.Topic = Topic;
//# sourceMappingURL=topic.js.map