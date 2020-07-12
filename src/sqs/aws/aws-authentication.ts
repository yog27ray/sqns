import V4 from 'aws-sdk/lib/signers/v4.js';
import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import moment from 'moment';
import { ExpressHelper, ExpressMiddleware } from '../routes/master/express-helper';
import { AwsError } from './aws-error';

function generateAuthorizationHash(accessKeyId: string, secretAccessKey: string, region: string, date: string, host: string,
                                   originalUrl: string, method: string, body: any): string {
  const testRequest = {
    method,
    region,
    body: Object.keys(body).sort().map((key: string) => `${key}=${encodeURIComponent(body[key])}`).join('&'),
    search: (): string => '',
    pathname: (): string => originalUrl,
    headers: {
      'X-Amz-Content-Sha256': crypto.createHash('sha256')
        .update(Object.keys(body).sort().map((key: string) => `${key}=${encodeURIComponent(body[key])}`).join('&'), 'utf8')
        .digest('hex'),
      Host: host,
      Authorization: '',
    },
  };
  new V4(testRequest, 'sqs', { signatureCache: true, operation: {}, signatureVersion: 'v4' })
    .addAuthorization(
      { accessKeyId, secretAccessKey },
      moment(date, 'YYYYMMDDTHHmmssZ').toDate());
  return testRequest.headers.Authorization;
}

function awsAuthentication(getSecretKey: (accessKey: string) => Promise<{ secretAccessKey: string; accessKeyId: string;
accountId: string; }>): ExpressMiddleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    const [accessKey, , region]: Array<string> = req.header('Authorization')
      .split(' ')[1].split('=')[1].split('/');
    getSecretKey(accessKey)
      .then(({ accessKeyId, secretAccessKey, accountId }: { secretAccessKey: string; accessKeyId: string; accountId: string }) => {
        const verificationHash = generateAuthorizationHash(
          accessKeyId,
          secretAccessKey,
          region,
          req.header('x-amz-date'),
          req.header('host'),
          req.originalUrl,
          req.method,
          req.body);
        const isTokenValid = req.header('Authorization') === verificationHash;
        if (isTokenValid) {
          Object.assign(req, { user: { accountId } });
          return next();
        }
        throw new AwsError({
          code: 'SignatureDoesNotMatch',
          message: 'The request signature we calculated does not match the signature you provided.',
        });
      })
      .catch((error: any) => ExpressHelper.errorHandler(error, res));
  };
}

export { awsAuthentication, generateAuthorizationHash };
