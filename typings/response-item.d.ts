import { KeyValue, MessageAttributeMap } from './common';
export declare interface ResponseItem {
    MessageId?: string;
    ReceiptHandle?: string;
    MD5OfBody?: string;
    Body?: string;
    Attributes?: KeyValue;
    MD5OfMessageAttributes?: string;
    MessageAttributes?: MessageAttributeMap;
}
