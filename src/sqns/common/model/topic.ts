import { BaseObject, DeliveryPolicy, TopicAttributes, TopicTag, TopicType } from '../../../client';

class Topic extends BaseObject {
  arn: string;

  name: string;

  region: string;

  companyId: string;

  displayName: string;

  deliveryPolicy: DeliveryPolicy;

  tags: TopicTag;

  attributes: TopicAttributes;

  constructor(item: TopicType) {
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

  updateAttributes(AttributeName: string, AttributeValue: string): void {
    const attributeEntry = this.attributes.entry.filter(({ key }: { key: string }) => (key === AttributeName))[0];
    if (attributeEntry) {
      attributeEntry.value = AttributeValue;
      return;
    }
    this.attributes.entry.push({ key: AttributeName, value: AttributeValue });
  }

  toJSON(): Record<string, unknown> {
    const json = {};
    Object.getOwnPropertyNames(this).forEach((property: string) => {
      json[property] = this[property];
    });
    return json;
  }

  private getARN(): string {
    return `arn:sqns:sns:${this.region}:${this.companyId}:${this.name}`;
  }
}

export { Topic };
