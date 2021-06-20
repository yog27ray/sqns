import { EventState } from '../src/sqns/common/model/event-item';
import { MessageAttributeMap } from './common';
export interface Message {
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
export interface FindMessageByIdResult {
    Message: Message & {
        State: EventState;
        EventTime: string;
    };
}
export interface UpdateMessageByIdResult {
    Message: Message & {
        State: EventState;
        EventTime: string;
    };
}
