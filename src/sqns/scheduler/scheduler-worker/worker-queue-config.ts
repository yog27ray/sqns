import { ConfigCount } from '../../../../typings/config';
import { ResponseItem } from '../../../../typings/response-item';
import { CreateQueueResult } from '../../../client';

class WorkerQueueConfig {
  private readonly _queueName: string;

  private readonly _config: ConfigCount;

  private _polling: boolean = false;

  private _hasMore: boolean = true;

  private _queue: CreateQueueResult;

  private _count: number = 0;

  private readonly _listener: (queueName: string, item: ResponseItem) => Promise<string>;

  constructor(
    queueName: string,
    listener: (queueName: string, item: ResponseItem) => Promise<string>,
    config: ConfigCount = { MAX_COUNT: 1 }) {
    this._queueName = queueName;
    this._config = Object.freeze({ ...config });
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

  get count(): number {
    return this._count;
  }

  incrementCount(): void {
    this._count += 1;
  }

  decrementCount(): void {
    this._count -= 1;
  }

  clone(): WorkerQueueConfig {
    return new WorkerQueueConfig(this.queueName, this.listener, { MAX_COUNT: this.config.MAX_COUNT });
  }
}

export { WorkerQueueConfig };
