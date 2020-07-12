import { AttributeNameList, MessageAttributeNameList, MessageList } from 'aws-sdk/clients/sqs';

interface ReceiveMessageRequest {
  QueueUrl: string;
  AttributeNames?: AttributeNameList;
  MessageAttributeNames?: MessageAttributeNameList;
  MaxNumberOfMessages?: number;
  VisibilityTimeout?: number;
}

interface ReceiveMessageResult {
  Messages?: MessageList;
}

export { ReceiveMessageRequest, ReceiveMessageResult };
