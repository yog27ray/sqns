import { Database } from '../storage';
import { EventItem } from './event-item';
import { EventQueue } from './event-queue';
declare class EventManager {
    private eventQueue;
    static readonly Database: typeof Database;
    private static DEFAULT_PRIORITIES;
    private _storageEngine;
    private storageToQueueWorker;
    get eventStats(): object;
    get prometheus(): string;
    constructor(eventQueue: EventQueue);
    setStorageEngine(database: Database, config?: any): void;
    initialize(notifyNeedTaskURLS?: Array<string>): void;
    comparatorFunction(queueName: string, value: (event1: EventItem, event2: EventItem) => boolean): void;
    add(queueName: string, eventItem: EventItem): Promise<any>;
    poll(queueName: string): Promise<EventItem>;
    reset(queueName: string): void;
    resetAll(preservePriorityName?: boolean): void;
    updateEventStateSuccess(queueName: string, id: string, data: any): Promise<any>;
    updateEventStateFailure(queueName: string, id: string, data: any): Promise<any>;
    private addEventInQueueListener;
    private addItemInQueue;
    private notifyTaskNeeded;
    private addToPriorities;
}
export { EventManager, EventItem };
