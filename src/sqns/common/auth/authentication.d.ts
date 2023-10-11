import { AuthRequest, Credentials, GetSecretKeyResult } from '../../../../typings/auth';
import { ExpressMiddleware } from '../../../../typings/express';
import { BaseStorageEngine } from '../model/base-storage-engine';
declare function getSecretKey(storageEngine: BaseStorageEngine): (accessKeyId: string) => Promise<GetSecretKeyResult>;
declare function signRequest(authRequest_: AuthRequest, credentials: Credentials, headerKeys_: Array<string>): void;
declare function authentication(getSecretKeyCallback: (accessKey: string) => Promise<GetSecretKeyResult>): ExpressMiddleware;
export { authentication, getSecretKey, signRequest };
