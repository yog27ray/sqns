import { NextFunction, Request, Response } from 'express';
import { GetSecretKeyResult } from '../../../../typings/auth';
import { ExpressMiddleware } from '../../../../typings/express';
import { AuthRequest, Credentials, signRequest } from '../../../client';
import { logger } from '../logger/logger';
import { BaseStorageEngine } from '../model/base-storage-engine';
import { User } from '../model/user';
import { ExpressHelper } from '../routes/express-helper';
import { SQNSErrorCreator } from './s-q-n-s-error-creator';

const log = logger.instance('Authentication');

function getSecretKey(storageEngine: BaseStorageEngine): (accessKeyId: string) => Promise<GetSecretKeyResult> {
  return async (accessKeyId: string): Promise<GetSecretKeyResult> => {
    const accessKey = await storageEngine.findAccessKey({ accessKey: accessKeyId })
      .catch((error: SQNSErrorCreator) => {
        if (error.code === 'NotFound') {
          log.error(`AccessKey not found: ${accessKeyId}`);
          SQNSErrorCreator.invalidSignatureError();
        }
        return Promise.reject(error);
      });
    const user = await storageEngine.findUser({ id: accessKey.userId });
    return { secretAccessKey: accessKey.secretKey, accessKeyId: accessKey.accessKey, user };
  };
}

function verifyRequest(authRequest: AuthRequest, credentials: Credentials, user: User): void {
  const testHeaders = { ...authRequest.headers };
  const headerKeys = testHeaders.authorization.split(', ')[1].split('=')[1].split(';');
  const testAuthRequest = { ...authRequest, headers: testHeaders };
  signRequest(testAuthRequest, credentials, headerKeys);
  log.verbose(
    'Matching generated hash:',
    testAuthRequest.headers.authorization,
    'against client hash: ',
    authRequest.headers.authorization);
  if (testAuthRequest.headers.authorization === authRequest.headers.authorization) {
    return;
  }
  log.error('Received Authentication Data:', authRequest);
  log.error('Authorization header received:', authRequest.headers.authorization);
  log.error('Matching generated hash:', testAuthRequest.headers.authorization, 'against client hash: ', authRequest.headers.authorization);
  if (!user.skipAuthentication) {
    SQNSErrorCreator.invalidSignatureError();
  }
}

function authentication(getSecretKeyCallback: (accessKey: string) => Promise<GetSecretKeyResult>): ExpressMiddleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    log.verbose('Authorization header received:', req.header('Authorization'));
    if (!req.header('Authorization') || req.header('Authorization').split(' ').length !== 4) {
      ExpressHelper.errorHandler(new SQNSErrorCreator({
        code: 'SignatureDoesNotMatch',
        message: 'The request signature we calculated does not match the signature you provided.',
      }) as Error, res);
      return;
    }
    const [accessKey, , region, service]: Array<string> = req.header('Authorization')
      .split(' ')[1].split('=')[1].split('/');
    log.verbose('AccessKey:', accessKey, '\tregion:', region, '\tservice:', service);
    getSecretKeyCallback(accessKey)
      .then(({ accessKeyId, secretAccessKey, user }: GetSecretKeyResult): Promise<void> => {
        log.verbose('DB AccessKey:', accessKeyId, '\tsecret:', secretAccessKey, '\tuser:', user.id);
        verifyRequest({
          region,
          originalUrl: req.originalUrl,
          method: req.method,
          body: req.body,
          headers: req.headers as Record<string, string>,
          service,
        }, { accessKeyId, secretAccessKey }, user);
        Object.assign(req, { user });
        return Promise.resolve();
      })
      .then(next)
      .catch((error: Error) => ExpressHelper.errorHandler(error, res));
  };
}

export { authentication, getSecretKey };
