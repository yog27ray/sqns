import { TopicAttributes, TopicTag, TopicType } from '../../../../typings/class-types';
import { DeliveryPolicy } from '../../../../typings/delivery-policy';
import { BaseObject } from './base-object';
declare class Topic extends BaseObject {
    arn: string;
    name: string;
    region: string;
    companyId: string;
    displayName: string;
    deliveryPolicy: DeliveryPolicy;
    tags: TopicTag;
    attributes: TopicAttributes;
    constructor(item: TopicType);
    updateAttributes(AttributeName: string, AttributeValue: string): void;
    toJSON(): Record<string, unknown>;
    private getARN;
}
export { Topic };
