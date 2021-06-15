import { QueueType } from '../../../../typings/class-types';
import { ChannelDeliveryPolicy } from '../../../../typings/delivery-policy';
import { ARN } from '../../../../typings/typings';
import { BaseObject } from './base-object';
declare class Queue extends BaseObject {
    ownerId: string;
    companyId: string;
    region: string;
    name: string;
    attributes: {
        [key: string]: string;
    };
    DeliveryPolicy: ChannelDeliveryPolicy;
    tags: {
        [key: string]: string;
    };
    arn: ARN;
    static arn(companyId: string, region: string, name: string): ARN;
    constructor(item: QueueType);
    getMaxReceiveCount(): number;
    private getARN;
}
export { Queue };
