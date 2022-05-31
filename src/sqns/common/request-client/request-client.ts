import fetch, { BodyInit, HeadersInit, Response } from 'node-fetch';
import { SQNSError } from '../auth/s-q-n-s-error';

class RequestClient {
  async post(
    url: string,
    { body, headers: headers_ = {}, json, jsonBody }: { body?: BodyInit; headers?: HeadersInit; json?: boolean; jsonBody?: boolean } = {})
    : Promise<unknown> {
    const headers = headers_;
    if (jsonBody) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(url, { method: 'POST', body, headers });
    return this.transformResponse(response, json);
  }

  async get(url: string, json?: boolean): Promise<unknown> {
    const response = await fetch(url);
    return this.transformResponse(response, json);
  }

  private async transformResponse(response: Response, json?: boolean): Promise<unknown> {
    if (response.status >= 200 && response.status < 300) {
      if (json) {
        return response.json();
      }
      return response.text();
    }
    const errorMessage = await response.text();
    throw new SQNSError({
      message: errorMessage,
      code: `${response.status}`,
    });
  }
}

export { RequestClient };
