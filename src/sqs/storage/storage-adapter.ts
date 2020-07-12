import { EventItem } from '../../../index';
import { Queue } from '../event-manager/queue';

interface StorageAdapter {
  addEventItem(queue: Queue, item: EventItem): Promise<EventItem>;
  findById(id: string): Promise<EventItem>;
  findEventsToProcess(queue: Queue, time: Date): Promise<Array<any>>;
  updateEvent(id: string, data: object): Promise<void>;
  getQueues(queueNamePrefix?: string): Promise<Array<Queue>>;
  createQueue(queueName: string, attributes: object, tag: object): Promise<Queue>;
  getQueue(queueName: string): Promise<Queue>;
  deleteQueue(queue: Queue): Promise<void>;
}

export { StorageAdapter };
