import { logger } from '../logger/logger';
import { AuthRequest, Credentials } from '../types';
import { Encryption } from './encryption';

const log = logger.instance('Authentication');

export function signRequest(authRequest_: AuthRequest, credentials: Credentials, headerKeys_: Array<string>): void {
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
  const credential = `Credential=${credentials.accessKeyId}/${data.headers['x-sqns-date'].substring(0, 8)}/${
    authRequest.region}/${authRequest.service}/request`;
  const signedHeaders = `SignedHeaders=${headerKeys.join(';')}`;
  const signature = `Signature=${hash}`;
  authRequest.headers.authorization = `${algorithm} ${credential}, ${signedHeaders}, ${signature}`;
}
