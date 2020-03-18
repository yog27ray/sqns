import rp from 'request-promise';
import { EventItem } from './event-item';

class MSQueueRequestHandler {
  addEventsToQueue(hostName: string, queueName: string, events: Array<EventItem>): Promise<any> {
    return rp({
      method: 'POST',
      uri: `${hostName}/queue/${queueName}/event/bulk/new`,
      body: events.map((item: EventItem) => item.toRequestBody()),
      json: true,
    });
  }

  async fetchEventsFromQueue(hostName: string, queueName: string): Promise<EventItem> {
    const [response]: Array<any> = await rp({
      uri: `${hostName}/queue/${queueName}/event/poll`,
      json: true,
    });
    if (!response) {
      return undefined;
    }
    return new EventItem(response);
  }
}

export { MSQueueRequestHandler };
