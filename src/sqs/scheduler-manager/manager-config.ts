import { RequestItem } from '../request-response-types/request-item';

class ManagerConfig {
  private _sending: boolean = false;

  private _baseParams: (() => { [key: string]: any }) | { [key: string]: any };

  private _listener: (nextItemListParams: { [key: string]: any }) => Promise<[{ [key: string]: any }, Array<RequestItem>]>;

  get sending(): boolean {
    return this._sending;
  }

  set sending(value: boolean) {
    this._sending = value;
  }

  get baseParams(): (() => { [key: string]: any }) | { [key: string]: any } {
    return this._baseParams;
  }

  set baseParams(value: (() => { [key: string]: any }) | { [key: string]: any }) {
    this._baseParams = value;
  }

  get listener(): (nextItemListParams: { [key: string]: any }) => Promise<[{ [key: string]: any }, Array<RequestItem>]> {
    return this._listener;
  }

  set listener(value: (nextItemListParams: { [key: string]: any }) => Promise<[{ [key: string]: any }, Array<RequestItem>]>) {
    this._listener = value;
  }
}

export { ManagerConfig };
