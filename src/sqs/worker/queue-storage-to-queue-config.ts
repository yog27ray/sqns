class QueueStorageToQueueConfig {
  private _sending: boolean = false;

  private _baseParams: { [key: string]: any } | (() => { [key: string]: any });

  private _listener: (queueName: string, nextItemListParams: { [key: string]: any }) => Promise<[{ [key: string]: any }, boolean]>;

  private _queueName: string;

  get sending(): boolean {
    return this._sending;
  }

  set sending(value: boolean) {
    this._sending = value;
  }

  get baseParams(): { [key: string]: any } | (() => { [key: string]: any }) {
    return this._baseParams;
  }

  set baseParams(value: { [key: string]: any } | (() => { [key: string]: any })) {
    this._baseParams = value;
  }

  get listener(): (queueName: string, nextItemListParams: { [key: string]: any }) => Promise<[{ [key: string]: any }, boolean]> {
    return this._listener;
  }

  set listener(value: (queueName: string, nextItemListParams: { [key: string]: any }) => Promise<[{ [key: string]: any }, boolean]>) {
    this._listener = value;
  }

  get queueName(): string {
    return this._queueName;
  }

  set queueName(value: string) {
    this._queueName = value;
  }
}

export { QueueStorageToQueueConfig };
