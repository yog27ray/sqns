import fetch, { Response } from 'node-fetch';
import { SQNSError } from '../auth/s-q-n-s-error';

type RequestInit = Parameters<typeof fetch>[1];
type BodyInit = RequestInit['body'];
type HeaderInit = RequestInit['headers'];

class RequestClient {
  private static MAX_RE_ATTEMPT = 3;

  static setMaxRetryAttempt(attempt: number): void {
    RequestClient.MAX_RE_ATTEMPT = attempt;
  }

  async http(
    url: string,
    { body, headers: headers_ = {}, json, jsonBody }: { body?: BodyInit; headers?: HeadersInit; json?: boolean; jsonBody?: boolean } = {},
    method: 'PUT' | 'POST' | 'DELETE' = 'POST'): Promise<unknown> {
    const headers = headers_;
    if (jsonBody) {
      headers['Content-Type'] = 'application/json';
    }
    return this.exponentialRetryServerErrorRequest(() => fetch(url, { method, body, headers }), json);
  }

  async get(url: string, json?: boolean): Promise<unknown> {
    return this.exponentialRetryServerErrorRequest(() => fetch(url), json);
  }

  private async transformResponse(response: Response, json: boolean): Promise<unknown> {
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

  private async exponentialRetryServerErrorRequest(
    callback: () => Promise<Response>,
    jsonResponse?: boolean,
    attempt: number = 1): Promise<unknown> {
    const response = await callback();
    if (response.status >= 500 && response.status < 600 && attempt < RequestClient.MAX_RE_ATTEMPT) {
      return this.retryWithAttempt(callback, jsonResponse, attempt);
    }
    return this.transformResponse(response, jsonResponse);
  }

  private async retryWithAttempt(callback: () => Promise<Response>, jsonResponse: boolean, attempt: number): Promise<unknown> {
    const waitTime = (3 ** attempt) * 1000;
    await new Promise((resolve: (item?: unknown) => void) => {
      setTimeout(resolve, waitTime);
    });
    return this.exponentialRetryServerErrorRequest(callback, jsonResponse, attempt + 1);
  }
}

export { RequestClient };
