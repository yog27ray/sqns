import { EventItem } from '../../../../index';
import { Queue } from '../../event-manager/queue';
import { StorageAdapter } from '../storage-adapter';
declare class InMemoryAdapter implements StorageAdapter {
    private _config;
    private _db;
    constructor(config: {
        [key: string]: any;
    });
    addEventItem(queue: Queue, item: EventItem): Promise<EventItem>;
    findEventsToProcess(queue: Queue, time: Date): Promise<Array<any>>;
    getQueues(queueNamePrefix?: string): Promise<Array<Queue>>;
    updateEvent(id: string, data: {
        [key: string]: any;
    }): Promise<void>;
    findById(id: string): Promise<EventItem>;
    createQueue(queueName: string, attributes: {
        [key: string]: any;
    }, tag: {
        [key: string]: any;
    }): Promise<Queue>;
    getQueue(queueName: string): Promise<Queue>;
    deleteQueue(queue: Queue): Promise<void>;
    private _createQueue;
    private getDBQueue;
}
export { InMemoryAdapter };
