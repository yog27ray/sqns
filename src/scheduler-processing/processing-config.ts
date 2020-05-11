import { injectable } from 'inversify';
import { EventItem } from '../event-manager';

@injectable()
class ProcessingConfig {
  private _config: { count: number } = { count: 0 };

  private _polling: boolean = false;

  private _hasMore: boolean = true;

  private _listener: (item: EventItem) => Promise<string>;

  get config(): { count: number } {
    return this._config;
  }

  get polling(): boolean {
    return this._polling;
  }

  set polling(value: boolean) {
    this._polling = value;
  }

  get listener(): (item: EventItem) => Promise<string> {
    return this._listener;
  }

  set listener(value: (item: EventItem) => Promise<string>) {
    this._listener = value;
  }

  get hasMore(): boolean {
    return this._hasMore;
  }

  set hasMore(value: boolean) {
    this._hasMore = value;
  }
}

export { ProcessingConfig };
