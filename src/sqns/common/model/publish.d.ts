import { ARN, MessageAttributes, MessageStructure } from '../../../../typings/typings';
import { PublishType } from '../../../../typings/class-types';
import { BaseObject } from './base-object';
declare class Publish extends BaseObject {
    static STATUS_PUBLISHING: string;
    static STATUS_PUBLISHED: string;
    id: string;
    topicArn: ARN;
    targetArn: ARN;
    destinationArn: ARN;
    Message: string;
    PhoneNumber: string;
    Subject: string;
    Status: string;
    MessageAttributes: MessageAttributes;
    MessageStructure: string;
    MessageStructureFinal: MessageStructure;
    constructor(item: PublishType);
}
export { Publish };
