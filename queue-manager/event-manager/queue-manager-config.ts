import { injectable } from 'inversify';

@injectable()
class QueueManagerConfig {
  private _queueName: string;

  private _masterURL: string;

  get masterURL(): string {
    return this._masterURL;
  }

  set masterURL(value: string) {
    this._masterURL = value;
  }

  get queueName(): string {
    return this._queueName;
  }

  set queueName(value: string) {
    this._queueName = value;
  }
}

export { QueueManagerConfig };
