import { EventItem } from '../../../index';
import { EventState } from '../event-manager/event-item';
import { Queue } from '../event-manager/queue';
declare enum Database {
    IN_MEMORY = 0,
    MONGO_DB = 1
}
declare class StorageEngine {
    static Database: typeof Database;
    private _storageAdapter;
    constructor(database: Database, config: {
        [key: string]: any;
    });
    addEventItem(queueName: string, eventItem_: EventItem): Promise<EventItem>;
    getQueueNames(): Promise<Array<string>>;
    findEventsToProcess(queueName: string, time: Date): Promise<Array<EventItem>>;
    updateEventStateProcessing(queue: Queue, eventItem_: EventItem, visibilityTimeout: number, message: string): Promise<any>;
    updateEventState(queueName: string, id: string, state: EventState, message: {
        [key: string]: any;
    }): Promise<any>;
    listQueues(queueNamePrefix: string): Promise<Array<Queue>>;
    createQueue(queueName: string, attributes: {
        [key: string]: any;
    }, tag: {
        [key: string]: any;
    }): Promise<Queue>;
    getQueue(queueName: string): Promise<Queue>;
    deleteQueue(queueName: string): Promise<void>;
    setDatabaseAdapter(database: Database, config: {
        [key: string]: any;
    }): void;
    findEvent(id: string): Promise<EventItem>;
}
export { StorageEngine, Database };
