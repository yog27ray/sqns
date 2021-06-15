import { QueueType } from '../../../../typings/class-types';
import { ChannelDeliveryPolicy } from '../../../../typings/delivery-policy';
import { ARN } from '../../../../typings/typings';
import { RESERVED_QUEUE_NAME } from '../helper/common';
import { DeliveryPolicyHelper } from '../helper/delivery-policy-helper';
import { BaseObject } from './base-object';

class Queue extends BaseObject {
  ownerId: string;

  companyId: string;

  region: string;

  name: string;

  attributes: { [key: string]: string };

  DeliveryPolicy: ChannelDeliveryPolicy;

  tags: { [key: string]: string };

  arn: ARN;

  static arn(companyId: string, region: string, name: string): ARN {
    if (RESERVED_QUEUE_NAME.includes(name)) {
      return `arn:sqns:sqs:${region}:sqns:${name}`;
    }
    return `arn:sqns:sqs:${region}:${companyId}:${name}`;
  }

  constructor(item: QueueType) {
    super(item);
    this.name = item.name;
    this.region = item.region;
    this.ownerId = item.ownerId;
    this.companyId = item.companyId;
    this.attributes = item.attributes || {};
    this.tags = item.tags || {};
    this.arn = item.arn || this.getARN();
    this.DeliveryPolicy = item.DeliveryPolicy || DeliveryPolicyHelper.verifyAndGetChannelDeliveryPolicy(this.attributes.DeliveryPolicy);
  }

  getMaxReceiveCount(): number {
    return Math.max(Number(this.attributes.maxReceiveCount || '3'), 1);
  }

  private getARN(): string {
    return Queue.arn(this.companyId, this.region, this.name);
  }
}

export { Queue };
