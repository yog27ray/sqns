import { RequestItem } from '../request-response-types/request-item';

class ManagerConfig {
  private _sending: boolean = false;

  private _baseParams: any;

  private _listener: (nextItemListParams: object) => Promise<[object, Array<RequestItem>]>;

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

  get listener(): (nextItemListParams: object) => Promise<[object, Array<RequestItem>]> {
    return this._listener;
  }

  set listener(value: (nextItemListParams: object) => Promise<[object, Array<RequestItem>]>) {
    this._listener = value;
  }
}

export { ManagerConfig };
