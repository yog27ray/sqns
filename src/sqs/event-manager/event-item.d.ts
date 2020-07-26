declare enum EventState {
    SUCCESS = "SUCCESS",
    FAILURE = "FAILURE",
    PENDING = "PENDING",
    PROCESSING = "PROCESSING"
}
declare interface EventItemType {
    MessageBody: string;
    MessageAttribute?: {
        [key: string]: {
            DataType: string;
            StringValue: any;
        };
    };
    MessageSystemAttribute?: {
        [key: string]: {
            DataType: string;
            StringValue: any;
        };
    };
    queueId?: string;
    MessageDeduplicationId?: string;
    data?: {
        [key: string]: any;
    };
    receiveCount?: number;
    maxReceiveCount: number;
    id?: string;
    priority?: number;
    sentTime?: Date;
    firstSentTime?: Date;
    originalEventTime?: Date;
    eventTime?: Date;
    createdAt?: Date;
    state?: EventState;
}
declare class EventItem {
    static State: typeof EventState;
    static PRIORITY: {
        DEFAULT: number;
    };
    id: string;
    queueId: string;
    MessageDeduplicationId: string;
    MessageBody: string;
    MessageAttribute: {
        [key: string]: {
            DataType: string;
            StringValue: any;
        };
    };
    MessageSystemAttribute: {
        [key: string]: {
            DataType: string;
            StringValue: any;
        };
    };
    priority: number;
    receiveCount: number;
    maxReceiveCount: number;
    createdAt: Date;
    sentTime: Date;
    firstSentTime: Date;
    data: {
        [key: string]: any;
    };
    eventTime: Date;
    originalEventTime: Date;
    state: EventState;
    constructor(item: EventItemType);
    toJSON(): {
        [key: string]: any;
    };
    clone(): EventItem;
    updateSentTime(date: Date): void;
    incrementReceiveCount(): void;
}
export { EventItem, EventState };
