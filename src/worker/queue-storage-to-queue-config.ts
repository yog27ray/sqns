class QueueStorageToQueueConfig {
  private _sending: boolean = false;

  private _baseParams: any;

  private _listener: (queueName: string, nextItemListParams: object) => Promise<[object, boolean]>;

  private _queueName: string;

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

  get listener(): (queueName: string, nextItemListParams: object) => Promise<[object, boolean]> {
    return this._listener;
  }

  set listener(value: (queueName: string, nextItemListParams: object) => Promise<[object, boolean]>) {
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
