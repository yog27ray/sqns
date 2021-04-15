"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Publish = void 0;
const base_object_1 = require("./base-object");
class Publish extends base_object_1.BaseObject {
    constructor(item) {
        super(item);
        this.topicArn = item.topicArn;
        this.targetArn = item.targetArn;
        this.destinationArn = this.targetArn || this.topicArn;
        this.Message = item.Message;
        this.PhoneNumber = item.PhoneNumber;
        this.Subject = item.Subject;
        this.Status = item.Status;
        this.MessageAttributes = item.MessageAttributes;
        this.MessageStructure = item.MessageStructure;
        this.MessageStructureFinal = item.MessageStructureFinal;
    }
}
exports.Publish = Publish;
Publish.STATUS_PUBLISHING = 'Publishing';
Publish.STATUS_PUBLISHED = 'Published';
//# sourceMappingURL=publish.js.map