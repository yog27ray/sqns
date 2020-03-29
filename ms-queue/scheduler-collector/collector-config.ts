import { injectable } from 'inversify';
import { EventItem } from '../event-manager';

@injectable()
class CollectorConfig {
  private _sending: boolean = false;

  private _baseParams: any;

  private _listener: (nextItemListParams: object) => Promise<[object, Array<EventItem>]>;

  get sending(): boolean {
    return this._sending;
  }

  set sending(value: boolean) {
    this._sending = value;
  }

  get baseParams(): any {
    return this._baseParams;
  }

  set baseParams(value: any) {
    this._baseParams = value;
  }

  get listener(): (nextItemListParams: object) => Promise<[object, Array<EventItem>]> {
    return this._listener;
  }

  set listener(value: (nextItemListParams: object) => Promise<[object, Array<EventItem>]>) {
    this._listener = value;
  }
}

export { CollectorConfig };
