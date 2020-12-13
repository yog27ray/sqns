import fetch, { BodyInit, HeaderInit } from 'node-fetch';
import rp from 'request-promise';
import { SQNSError } from '../auth/s-q-n-s-error';

class RequestClient {
  requestPromise(request: unknown): Promise<unknown> {
    return rp(request) as Promise<unknown>;
  }

  async post(
    url: string,
    { body, headers: headers_ = {}, json }: { body?: BodyInit; headers?: HeaderInit; json?: boolean } = {}): Promise<unknown> {
    const headers = headers_;
    if (json) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, { method: 'POST', body, headers });
    if (res.status >= 200 && res.status < 300) {
      if (json) {
        return res.json();
      }
      return res.text();
    }
    const errorMessage = await res.text();
    throw new SQNSError({
      message: `${res.status} ${errorMessage}`,
      code: 'PostRequestFailure',
    });
  }

  async get(url: string): Promise<unknown> {
    const res = await fetch(url);
    return res.text();
  }
}

export { RequestClient };
