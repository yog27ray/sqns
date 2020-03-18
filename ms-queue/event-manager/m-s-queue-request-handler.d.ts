import { EventItem } from './event-item';
declare class MSQueueRequestHandler {
    addEventsToQueue(hostName: string, queueName: string, events: Array<EventItem>): Promise<any>;
    fetchEventsFromQueue(hostName: string, queueName: string): Promise<EventItem>;
}
export { MSQueueRequestHandler };
