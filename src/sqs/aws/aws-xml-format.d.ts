import { EventItem } from '../../../index';
import { Queue } from '../event-manager/queue';
declare class AwsXmlFormat {
    static errorResponse(code: string, message: string, details?: string): string;
    static createQueue(host: string, queue: string): string;
    static getQueueURL(host: string, queue: string): string;
    static deleteQueue(): string;
    static listQueues(host: string, queues: Array<Queue>): string;
    static sendMessage(requestId: string, event: EventItem): string;
    static generateSendMessageResponse(event: EventItem): {
        [key: string]: any;
    };
    static sendMessageBatch(requestId: string, events: Array<EventItem>, batchIds: Array<string>): string;
    static receiveMessage(requestId: string, messages: Array<any>, AttributeName: Array<string>, MessageAttributeName: Array<string>): string;
    private static responseMessage;
    private static md5HashJSON;
    private static md5Hash;
    private static generateSQSURL;
}
export { AwsXmlFormat };
