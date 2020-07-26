import { Database } from '../storage';
import { EventItem } from './event-item';
import { Queue } from './queue';
declare class EventManager {
    static readonly Database: typeof Database;
    private static DEFAULT_PRIORITIES;
    private _eventQueue;
    private _storageEngine;
    private storageToQueueWorker;
    get eventStats(): {
        [key: string]: any;
    };
    prometheus(time?: Date): string;
    constructor();
    setStorageEngine(database: Database, config: {
        [key: string]: any;
    }, cronInterval?: string): void;
    initialize(notifyNeedTaskURLS?: Array<string>): void;
    comparatorFunction(queueName: string, value: (event1: EventItem, event2: EventItem) => boolean): void;
    poll(queue: Queue, visibilityTimeout: number): Promise<EventItem>;
    resetAll(resetOnlyStatistics?: boolean): void;
    updateEventStateSuccess(queueName: string, id: string, message: string): Promise<any>;
    updateEventStateFailure(queueName: string, id: string, message: string): Promise<any>;
    listQueues(queueNamePrefix: string): Promise<Array<Queue>>;
    createQueue(queueName: string, attributes: {
        [key: string]: any;
    }, tag: {
        [key: string]: any;
    }): Promise<Queue>;
    getQueue(queueName: string): Promise<Queue>;
    deleteQueue(queueName: string): Promise<void>;
    sendMessage(queueName: string, MessageBody: string, MessageAttribute: {
        [key: string]: any;
    }, MessageSystemAttribute: {
        [key: string]: any;
    }, DelaySeconds?: string, MessageDeduplicationId?: string): Promise<EventItem>;
    receiveMessage(queue: Queue, VisibilityTimeout?: string, MaxNumberOfMessages?: string): Promise<Array<EventItem>>;
    cancel(): void;
    private pollN;
    private addEventInQueueListener;
    private addItemInQueue;
    private addToPriorities;
}
export { EventManager, EventItem };
