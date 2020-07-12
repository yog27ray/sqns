import { Integer, MessageBodyAttributeMap, MessageBodySystemAttributeMap } from 'aws-sdk/clients/sqs';

interface SendMessage {
  MessageBody: string;
  DelaySeconds?: Integer;
  MessageAttributes?: MessageBodyAttributeMap;
  MessageSystemAttributes?: MessageBodySystemAttributeMap;
  MessageDeduplicationId?: string;
}

type SendMessageRequest = SendMessage & { QueueUrl: string };

interface SendMessageResult {
  MD5OfMessageBody?: string;
  MD5OfMessageAttributes?: string;
  MD5OfMessageSystemAttributes?: string;
  MessageId?: string;
}

interface SendMessageBatchRequest {
  QueueUrl: string;
  Entries: Array<SendMessage & { Id: string }>;
}

interface BatchResultErrorEntry {
  Id: string;
  SenderFault: boolean;
  Code: string;
  Message?: string;
}

interface SendMessageBatchResult {
  Successful: Array<SendMessageResult & { Id: string }>;
  Failed: Array<BatchResultErrorEntry>;
}

export { SendMessageRequest, SendMessageResult, SendMessageBatchRequest, SendMessageBatchResult };
