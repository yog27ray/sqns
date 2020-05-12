import { StorageAdapter } from '../storage-adapter';
declare class MongoDBAdapter implements StorageAdapter {
    private static readonly QUEUE_TABLE_PREFIX;
    private readonly connection;
    constructor(config: any);
    addEventItem(queueName: string, eventItem: any): Promise<void>;
    findEventsToProcess(queueName: string, time: Date): Promise<Array<any>>;
    getQueueNames(): Promise<Array<string>>;
    updateEvent(queueName: string, id: string, data: object): Promise<any>;
    private dbToSystemItem;
    private getTableName;
}
export { MongoDBAdapter };
