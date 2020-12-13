import { CreateQueueResult } from '../../../../typings';
import { ConfigCount } from '../../../../typings/config';
import { ResponseItem } from '../../../../typings/response-item';

class WorkerQueueConfig {
  private readonly _queueName: string;

  private _config: ConfigCount = { count: 0, MAX_COUNT: 1 };

  private _polling: boolean = false;

  private _hasMore: boolean = true;

  private _queue: CreateQueueResult;

  private _listener: (queueName: string, item: ResponseItem) => Promise<string>;

  constructor(queueName: string) {
    this._queueName = queueName;
  }

  get queueName(): string {
    return this._queueName;
  }

  get config(): ConfigCount {
    return this._config;
  }

  get polling(): boolean {
    return this._polling;
  }

  set polling(value: boolean) {
    this._polling = value;
  }

  get queue(): CreateQueueResult {
    return this._queue;
  }

  set queue(value: CreateQueueResult) {
    this._queue = value;
  }

  get listener(): (queueName: string, item: ResponseItem) => Promise<string> {
    return this._listener;
  }

  set listener(value: (queueName: string, item: ResponseItem) => Promise<string>) {
    this._listener = value;
  }

  get hasMore(): boolean {
    return this._hasMore;
  }

  set hasMore(value: boolean) {
    this._hasMore = value;
  }
}

export { WorkerQueueConfig };
