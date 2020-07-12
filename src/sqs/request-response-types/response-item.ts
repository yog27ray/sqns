import { MessageBodyAttributeMap, MessageSystemAttributeMap } from 'aws-sdk/clients/sqs';

declare interface ResponseItem {
  MessageId?: string;

  ReceiptHandle?: string;

  MD5OfBody?: string;

  Body?: string;

  Attributes?: MessageSystemAttributeMap;

  MD5OfMessageAttributes?: string;

  MessageAttributes?: MessageBodyAttributeMap;
}

export { ResponseItem };
