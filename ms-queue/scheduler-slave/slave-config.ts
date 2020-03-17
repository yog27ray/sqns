import { injectable } from 'inversify';
import { EventItem } from '../event-manager';

@injectable()
class SlaveConfig {
  private _config: { count: number } = { count: 0 };

  private _polling: boolean = false;

  private _hasMore: boolean = true;

  private _listener: (item: EventItem) => Promise<void>;

  get config(): { count: number } {
    return this._config;
  }

  set config(value: { count: number }) {
    this._config = value;
  }

  get polling(): boolean {
    return this._polling;
  }

  set polling(value: boolean) {
    this._polling = value;
  }

  get listener(): (item: EventItem) => Promise<void> {
    return this._listener;
  }

  set listener(value: (item: EventItem) => Promise<void>) {
    this._listener = value;
  }

  get hasMore(): boolean {
    return this._hasMore;
  }

  set hasMore(value: boolean) {
    this._hasMore = value;
  }
}

export { SlaveConfig };
