import { BASE_CONFIG, KeyValue } from '../../../../typings/typings';
import { QueueStorageToQueueConfigListener } from '../../../../typings/config';
import { Queue } from '../../common/model/queue';

export class QueueStorageToQueueConfig {
  private _sending: boolean = false;

  private _baseParams: BASE_CONFIG;

  private _listener: QueueStorageToQueueConfigListener;

  private _queues: Array<Queue>;

  get sending(): boolean {
    return this._sending;
  }

  set sending(value: boolean) {
    this._sending = value;
  }

  get baseParams(): BASE_CONFIG {
    return this._baseParams;
  }

  set baseParams(value: BASE_CONFIG) {
    this._baseParams = value;
  }

  get listener(): QueueStorageToQueueConfigListener {
    return this._listener;
  }

  set listener(value: QueueStorageToQueueConfigListener) {
    this._listener = value;
  }

  get queues(): Array<Queue> {
    return this._queues;
  }

  set queues(value: Array<Queue>) {
    this._queues = value;
  }

  get cloneBaseParams(): KeyValue {
    if (typeof this.baseParams === 'function') {
      return this.baseParams();
    }
    return JSON.parse(JSON.stringify(this.baseParams)) as KeyValue;
  }
}
