declare class MongoDBConnection {
    private readonly _option;
    private readonly _uri;
    private readonly _dBName;
    private client;
    constructor(uri: string, config: any);
    isConnected(): boolean;
    connect(): Promise<any>;
    find(tableName: string, query?: any, sort?: any): Promise<Array<any>>;
    findOne(tableName: string, query?: any): Promise<any>;
    dropDatabase(): Promise<any>;
    getCollections(): Promise<Array<string>>;
    insert(collectionName: string, eventItem: any): Promise<any>;
    update(collectionName: string, documentId: string, document: object): Promise<void>;
    private getDB;
    private isFilePath;
}
export { MongoDBConnection };
