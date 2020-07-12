import { Integer, MessageBodyAttributeMap, MessageBodySystemAttributeMap } from 'aws-sdk/clients/sqs';

declare interface RequestItem {
  MessageBody: string;

  DelaySeconds?: Integer;

  MessageAttributes?: MessageBodyAttributeMap;

  MessageSystemAttributes?: MessageBodySystemAttributeMap;

  MessageDeduplicationId?: string;

  MessageGroupId?: string;
}

export { RequestItem };
