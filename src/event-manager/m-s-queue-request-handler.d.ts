import { EventItem } from './event-item';
declare class MSQueueRequestHandler {
    addEventsToQueue(hostName: string, queueName: string, events: Array<EventItem>): Promise<any>;
    fetchEventsFromQueue(hostName: string, queueName: string): Promise<EventItem>;
    markEventSuccess(hostName: string, queueName: string, eventId: string, message?: string): Promise<any>;
    markEventFailure(hostName: string, queueName: string, eventId: string, message?: string): Promise<any>;
}
export { MSQueueRequestHandler };
