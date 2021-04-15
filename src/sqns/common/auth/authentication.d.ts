import { GetSecretKeyResult } from '../../../../typings/auth';
import { ExpressMiddleware } from '../../../../typings/express';
import { BaseStorageEngine } from '../model/base-storage-engine';
declare function getSecretKey(storageEngine: BaseStorageEngine): (accessKeyId: string) => Promise<GetSecretKeyResult>;
declare interface GenerateAuthenticationHash {
    accessKeyId: string;
    secretAccessKey: string;
    service: string;
    region: string;
    date: string;
    host: string;
    originalUrl: string;
    method: string;
    body: {
        [key: string]: any;
    };
}
declare function generateAuthenticationHash({ service, method, accessKeyId, secretAccessKey, region, date, host, originalUrl, body }: GenerateAuthenticationHash): string;
declare function authentication(getSecretKeyCallback: (accessKey: string) => Promise<GetSecretKeyResult>): ExpressMiddleware;
export { authentication, generateAuthenticationHash, getSecretKey };
