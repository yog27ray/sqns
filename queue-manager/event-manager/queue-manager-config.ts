import { injectable } from 'inversify';

@injectable()
class QueueManagerConfig {
  private _masterURL: string;

  get masterURL(): string {
    return this._masterURL;
  }

  set masterURL(value: string) {
    this._masterURL = value;
  }
}

export { QueueManagerConfig };
