import { NextFunction, Request, Response } from 'express';
import { AuthRequest, Credentials, GetSecretKeyResult } from '../../../../typings/auth';
import { ExpressMiddleware } from '../../../../typings/express';
import { logger } from '../logger/logger';
import { BaseStorageEngine } from '../model/base-storage-engine';
import { User } from '../model/user';
import { ExpressHelper } from '../routes/express-helper';
import { Encryption } from './encryption';
import { SQNSError } from './s-q-n-s-error';

const log = logger.instance('Authentication');

function getSecretKey(storageEngine: BaseStorageEngine): (accessKeyId: string) => Promise<GetSecretKeyResult> {
  return async (accessKeyId: string): Promise<GetSecretKeyResult> => {
    const accessKey = await storageEngine.findAccessKey({ accessKey: accessKeyId })
      .catch((error: SQNSError) => {
        if (error.code === 'NotFound') {
          log.error(`AccessKey not found: ${accessKeyId}`);
          SQNSError.invalidSignatureError();
        }
        return Promise.reject(error);
      });
    const user = await storageEngine.findUser({ id: accessKey.userId });
    return { secretAccessKey: accessKey.secretKey, accessKeyId: accessKey.accessKey, user };
  };
}

function signRequest(authRequest_: AuthRequest, credentials: Credentials, headerKeys_: Array<string>): void {
  log.verbose('Received Authentication Data:', authRequest_);
  const authRequest = authRequest_;
  const headerKeys = headerKeys_.map((each: string) => each).sort();
  authRequest.headers['x-sqns-content-sha256'] = Encryption.createJSONHash('sha256', authRequest.body as Record<string, unknown>);
  const data = { ...authRequest, accessKeyId: credentials.accessKeyId };
  data.headers = headerKeys.reduce((result_: Record<string, string>, key: string) => {
    const result = result_;
    result[key] = authRequest.headers[key];
    return result;
  }, {});
  const hash = Encryption.createJSONHmac('sha256', credentials.secretAccessKey, data);
  const algorithm = 'SQNS-HMAC-SHA256';
  console.log('>>>>data.headers:', data.headers, authRequest.headers);
  const credential = `Credential=${credentials.accessKeyId}/${data.headers['x-sqns-date'].substring(0, 8)}/${
    authRequest.region}/${authRequest.service}/request`;
  const signedHeaders = `SignedHeaders=${headerKeys.join(';')}`;
  const signature = `Signature=${hash}`;
  authRequest.headers.authorization = `${algorithm} ${credential}, ${signedHeaders}, ${signature}`;
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
    SQNSError.invalidSignatureError();
  }
}

function authentication(getSecretKeyCallback: (accessKey: string) => Promise<GetSecretKeyResult>): ExpressMiddleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    log.verbose('Authorization header received:', req.header('Authorization'));
    if (!req.header('Authorization') || req.header('Authorization').split(' ').length !== 4) {
      ExpressHelper.errorHandler(new SQNSError({
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

export { authentication, getSecretKey, signRequest };
