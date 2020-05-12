declare enum EventState {
    SUCCESS = "SUCCESS",
    FAILURE = "FAILURE",
    PENDING = "PENDING",
    PROCESSING = "PROCESSING"
}
declare class EventItem {
    static State: typeof EventState;
    static PRIORITY: {
        DEFAULT: number;
    };
    id: string;
    type: string;
    priority: number;
    createdAt: Date;
    data: object;
    eventTime: Date;
    state: EventState;
    constructor(item: {
        type: string;
        data?: object;
        id?: string;
        priority?: number;
        eventTime?: Date;
        createdAt?: Date;
        state?: EventState;
    });
    createResponse(): object;
    toRequestBody(): object;
    toJSON(): object;
}
export { EventItem, EventState };
