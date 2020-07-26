import { EventItem } from '../../../../index';
import { Queue } from '../../event-manager/queue';
import { StorageAdapter } from '../storage-adapter';
declare class MongoDBAdapter implements StorageAdapter {
    private static readonly QUEUE_TABLE_PREFIX;
    private readonly connection;
    constructor(config: {
        [key: string]: any;
        uri?: string;
    });
    addEventItem(queue: Queue, eventItem: EventItem): Promise<EventItem>;
    findEventsToProcess(queue: Queue, time: Date): Promise<Array<{
        [key: string]: any;
    }>>;
    getQueues(queueNamePrefix?: string): Promise<Array<Queue>>;
    updateEvent(id: string, data: {
        [key: string]: any;
    }): Promise<any>;
    findById(id: string): Promise<EventItem>;
    createQueue(queueName: string, attributes: {
        [key: string]: any;
    }): Promise<Queue>;
    getQueue(name: string): Promise<Queue>;
    deleteQueue(queue: Queue): Promise<void>;
    private dbToSystemItem;
    private getTableName;
}
export { MongoDBAdapter };
