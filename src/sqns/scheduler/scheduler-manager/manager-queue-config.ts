import { ManagerQueueConfigListener } from '../../../../typings/config';
import { BASE_CONFIG, CreateQueueResult, KeyValue } from '../../../../typings/typings';

export class ManagerQueueConfig {
  private readonly _queueName: string;

  private _queue: CreateQueueResult;

  private _sending: boolean = false;

  private _queryBaseParams: BASE_CONFIG;

  private _listener: ManagerQueueConfigListener;

  constructor(queueName: string) {
    this._queueName = queueName;
  }

  get queueName(): string {
    return this._queueName;
  }

  get sending(): boolean {
    return this._sending;
  }

  set sending(value: boolean) {
    this._sending = value;
  }

  get queue(): CreateQueueResult {
    return this._queue;
  }

  set queue(value: CreateQueueResult) {
    this._queue = value;
  }

  get queryBaseParams(): BASE_CONFIG {
    return this._queryBaseParams;
  }

  set queryBaseParams(value: BASE_CONFIG) {
    this._queryBaseParams = value;
  }

  get listener(): ManagerQueueConfigListener {
    return this._listener;
  }

  set listener(value: ManagerQueueConfigListener) {
    this._listener = value;
  }

  get cloneBaseParams(): KeyValue {
    if (typeof this.queryBaseParams === 'function') {
      const baseParamsFunction: () => KeyValue = this.queryBaseParams as () => KeyValue;
      return baseParamsFunction();
    }
    return JSON.parse(JSON.stringify(this.queryBaseParams)) as KeyValue;
  }
}
