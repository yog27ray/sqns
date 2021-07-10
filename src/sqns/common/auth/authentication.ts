import V4 from 'aws-sdk/lib/signers/v4.js';
import { NextFunction, Request, Response } from 'express';
import moment from 'moment';
import { GetSecretKeyResult } from '../../../../typings/auth';
import { ExpressMiddleware } from '../../../../typings/express';
import { logger } from '../logger/logger';
import { BaseStorageEngine } from '../model/base-storage-engine';
import { ExpressHelper } from '../routes/express-helper';
import { Encryption } from './encryption';
import { SQNSError } from './s-q-n-s-error';

const log = logger.instance('Authentication');

function getSecretKey(storageEngine: BaseStorageEngine): (accessKeyId: string) => Promise<GetSecretKeyResult> {
  return async (accessKeyId: string): Promise<GetSecretKeyResult> => {
    const accessKey = await storageEngine.findAccessKey({ accessKey: accessKeyId })
      .catch((error: SQNSError) => {
        if (error.code === 'NotFound') {
          log.verbose(`AccessKey not found: ${accessKeyId}`);
          SQNSError.invalidSignatureError();
        }
        return Promise.reject(error);
      });
    const user = await storageEngine.findUser({ id: accessKey.userId });
    return { secretAccessKey: accessKey.secretKey, accessKeyId: accessKey.accessKey, user };
  };
}

declare interface GenerateAuthenticationHash {
  accessKeyId: string;
  secretAccessKey: string;
  service: string;
  region: string;
  date: string;
  host: string;
  originalUrl: string;
  method: string;
  body: { [key: string]: any };
}

function rfc3986EncodeURIComponent(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, escape);
}

function generateAuthenticationHash({ service, method, accessKeyId, secretAccessKey, region, date, host, originalUrl, body }
: GenerateAuthenticationHash): string {
  log.verbose('Received Authentication Data:', { service, method, accessKeyId, secretAccessKey, region, date, host, originalUrl, body });
  const testRequest = {
    method,
    region,
    body: Object.keys(body).sort().map((key: string) => `${key}=${rfc3986EncodeURIComponent(body[key])}`).join('&'),
    search: (): string => '',
    pathname: (): string => decodeURIComponent(originalUrl),
    headers: {
      'X-Amz-Content-Sha256': Encryption.createHash(
        'sha256',
        Object.keys(body).sort().map((key: string) => `${key}=${rfc3986EncodeURIComponent(body[key])}`).join('&')),
      Host: host,
      Authorization: '',
    },
  };
  log.verbose('Matching Against Authentication Data:', testRequest.headers, moment(date, 'YYYYMMDDTHHmmssZ').toDate());
  new V4(testRequest, service, { signatureCache: true, operation: {}, signatureVersion: 'v4' })
    .addAuthorization(
      { accessKeyId, secretAccessKey },
      moment(date, 'YYYYMMDDTHHmmssZ').toDate());
  return testRequest.headers.Authorization;
}

function authentication(getSecretKeyCallback: (accessKey: string) => Promise<GetSecretKeyResult>): ExpressMiddleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    log.verbose('Authorization header received:', req.header('Authorization'));
    const [accessKey, , region, service]: Array<string> = req.header('Authorization')
      .split(' ')[1].split('=')[1].split('/');
    log.verbose('AccessKey:', accessKey, '\tregion:', region, '\tservice:', service);
    getSecretKeyCallback(accessKey)
      .then(({ accessKeyId, secretAccessKey, user }: GetSecretKeyResult): Promise<void> => {
        log.verbose('DB AccessKey:', accessKeyId, '\tsecret:', secretAccessKey, '\tuser:', user.id);
        const verificationHash = generateAuthenticationHash({
          accessKeyId,
          secretAccessKey,
          region,
          date: req.header('x-amz-date'),
          host: req.header('host'),
          originalUrl: req.originalUrl,
          method: req.method,
          body: req.body,
          service,
        });
        log.verbose('Matching generated hash:', verificationHash, 'against client hash: ', req.header('Authorization'));
        const isTokenValid = req.header('Authorization') === verificationHash;
        if (!isTokenValid) {
          SQNSError.invalidSignatureError();
        }
        Object.assign(req, { user });
        return Promise.resolve();
      })
      .then(next)
      .catch((error: Error) => ExpressHelper.errorHandler(error, res));
  };
}

export { authentication, generateAuthenticationHash, getSecretKey, rfc3986EncodeURIComponent };
