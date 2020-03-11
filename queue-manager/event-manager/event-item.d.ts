declare class EventItem {
    static PRIORITY: {
        DEFAULT: number;
    };
    id: string;
    type: string;
    priority: number;
    createdAt: Date;
    data: object;
    constructor(item: {
        type: string;
        data: object;
        id: string;
        priority: number;
    });
    createResponse(): object;
    toRequestBody(): object;
}
export { EventItem };
