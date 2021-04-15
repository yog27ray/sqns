import { MessageAttributeMap } from './common';
interface Message {
    MessageId?: string;
    ReceiptHandle?: string;
    MD5OfBody?: string;
    Body?: string;
    Attributes?: {
        [key: string]: string;
    };
    MD5OfMessageAttributes?: string;
    MessageAttributes?: MessageAttributeMap;
}
export interface ReceiveMessageRequest {
    QueueUrl: string;
    AttributeNames?: Array<string>;
    MessageAttributeNames?: Array<string>;
    MaxNumberOfMessages?: number;
    VisibilityTimeout?: number;
}
export interface ReceiveMessageResult {
    Messages?: Array<Message>;
}
export {};
