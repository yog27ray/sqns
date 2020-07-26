import { ExpressMiddleware } from '../routes/master/express-helper';
declare function generateAuthorizationHash(accessKeyId: string, secretAccessKey: string, region: string, date: string, host: string, originalUrl: string, method: string, body: {
    [key: string]: any;
}): string;
declare function awsAuthentication(getSecretKey: (accessKey: string) => Promise<{
    secretAccessKey: string;
    accessKeyId: string;
    accountId: string;
}>): ExpressMiddleware;
export { awsAuthentication, generateAuthorizationHash };
