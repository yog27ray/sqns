import { StorageAdapter } from '../storage-adapter';
declare class InMemoryAdapter implements StorageAdapter {
    private _config;
    private _db;
    constructor(config: any);
    addEventItem(queueName: string, item: object): Promise<any>;
    findEventsToProcess(queueName: string, time: Date): Promise<Array<any>>;
    getQueueNames(): Promise<Array<string>>;
    updateEvent(queueName: string, id: string, data: object): Promise<any>;
    private getDBQueue;
}
export { InMemoryAdapter };
