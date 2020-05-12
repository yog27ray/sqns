import { EventItem } from '../../index';
declare enum Database {
    IN_MEMORY = 0,
    MONGO_DB = 1
}
declare class StorageEngine {
    static Database: typeof Database;
    private _storageAdapter;
    constructor(database: Database, config: any);
    addEventItem(queueName: string, eventItem: EventItem): Promise<EventItem>;
    getQueueNames(): Promise<Array<string>>;
    findEventsToProcess(queueName: string, time: Date): Promise<Array<EventItem>>;
    updateEventStateProcessing(queueName: string, id: string, message: string): Promise<any>;
    updateEventStateSuccess(queueName: string, id: string, successResponse: any): Promise<any>;
    updateEventStateFailure(queueName: string, id: string, failureResponse: any): Promise<any>;
    private setDatabaseAdapter;
}
export { StorageEngine, Database };
