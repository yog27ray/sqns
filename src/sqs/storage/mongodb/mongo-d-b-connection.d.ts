declare class MongoDBConnection {
    private readonly _option;
    private readonly _uri;
    private readonly _dBName;
    private client;
    constructor(uri: string, config: {
        [key: string]: any;
    });
    isConnected(): boolean;
    connect(): Promise<any>;
    find(tableName: string, query?: any, sort?: {
        [key: string]: number;
    }, limit?: number): Promise<Array<any>>;
    findOne(tableName: string, filter?: any): Promise<{
        [key: string]: any;
    }>;
    dropDatabase(): Promise<any>;
    insert(collectionName: string, item: {
        [key: string]: any;
    }): Promise<string>;
    update(collectionName: string, documentId: string, document: {
        [key: string]: any;
    }): Promise<void>;
    deleteOne(collectionName: string, filter: {
        [key: string]: any;
    }): Promise<void>;
    deleteMany(collectionName: string, filter: {
        [key: string]: any;
    }): Promise<void>;
    private getDB;
    private isFilePath;
}
export { MongoDBConnection };
