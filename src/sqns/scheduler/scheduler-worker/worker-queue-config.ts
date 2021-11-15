import { ConfigCount } from '../../../../typings/config';
import { CreateQueueResult } from '../../../../typings/queue';
import { ResponseItem } from '../../../../typings/response-item';

class WorkerQueueConfig {
  private readonly _queueName: string;

  private _config: ConfigCount = { count: 0, MAX_COUNT: 1 };

  private _polling: boolean = false;

  private _hasMore: boolean = true;

  private _queue: CreateQueueResult;

  private readonly _listener: (queueName: string, item: ResponseItem) => Promise<string>;

  constructor(queueName: string, listener: (queueName: string, item: ResponseItem) => Promise<string>) {
    this._queueName = queueName;
    this._listener = listener;
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

  get hasMore(): boolean {
    return this._hasMore;
  }

  set hasMore(value: boolean) {
    this._hasMore = value;
  }

  clone(): WorkerQueueConfig {
    const config = new WorkerQueueConfig(this.queueName, this.listener);
    config._config = { MAX_COUNT: this.config.MAX_COUNT, count: 0 };
    return config;
  }
}

export { WorkerQueueConfig };
