import { ResponseItem } from '../request-response-types/response-item';

class WorkerConfig {
  private _config: { count: number } = { count: 0 };

  private _polling: boolean = false;

  private _hasMore: boolean = true;

  private _listener: (item: ResponseItem) => Promise<string>;

  get config(): { count: number } {
    return this._config;
  }

  get polling(): boolean {
    return this._polling;
  }

  set polling(value: boolean) {
    this._polling = value;
  }

  get listener(): (item: ResponseItem) => Promise<string> {
    return this._listener;
  }

  set listener(value: (item: ResponseItem) => Promise<string>) {
    this._listener = value;
  }

  get hasMore(): boolean {
    return this._hasMore;
  }

  set hasMore(value: boolean) {
    this._hasMore = value;
  }
}

export { WorkerConfig };
