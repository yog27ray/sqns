import { ARN, MessageAttributes, MessageStructure } from '../../../../typings/typings';
import { PublishType } from '../../../../typings/class-types';
import { BaseObject } from './base-object';

class Publish extends BaseObject {
  static STATUS_PUBLISHING: string = 'Publishing';

  static STATUS_PUBLISHED: string = 'Published';

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

  constructor(item: PublishType) {
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

export { Publish };
