import { SQSConfig } from '../../../../typings/config';
import { SQSPriorities } from '../../../../typings/manager';
import { ARN, ChannelDeliveryPolicy, EventItem, MessageAttributeMap, RequestClient } from '../../../client';
import { DeliveryPolicyHelper } from '../../common/helper/delivery-policy-helper';
import { logger } from '../../common/logger/logger';
import { BaseManager } from '../../common/model/base-manager';
import { BaseStorageEngine } from '../../common/model/base-storage-engine';
import { Queue } from '../../common/model/queue';
import { User } from '../../common/model/user';
import { StorageToQueueWorker } from '../worker/storage-to-queue-worker';
import { SQSQueue } from './s-q-s-queue';
import { SQSStorageEngine } from './s-q-s-storage-engine';

const log = logger.instance('EventManager');

export class SQSManager extends BaseManager {
  static DEFAULT_PRIORITIES: SQSPriorities = { PRIORITY_TOTAL: 0 };

  static DISABLE_RECEIVE_MESSAGE: boolean = false;

  private requestClient = new RequestClient();

  private readonly _sQSStorageEngine: SQSStorageEngine;

  private _eventQueue: SQSQueue;

  private storageToQueueWorker: StorageToQueueWorker;

  private addEventInQueueListener: (item: EventItem) => void = ((item: EventItem) => {
    this.addItemInQueue(item);
  });

  private static addToPriorities(queueARN: ARN, priority: number): void {
    const statKey = `PRIORITY_${priority}`;
    if (isNaN(SQSManager.DEFAULT_PRIORITIES[statKey] as number)) {
      SQSManager.DEFAULT_PRIORITIES[statKey] = 0;
    }
    if (!SQSManager.DEFAULT_PRIORITIES[queueARN]) {
      SQSManager.DEFAULT_PRIORITIES[queueARN] = { PRIORITY_TOTAL: 0 };
    }
    if (isNaN((SQSManager.DEFAULT_PRIORITIES[queueARN] as Record<string, number>)[statKey])) {
      SQSManager.DEFAULT_PRIORITIES[queueARN][statKey] = 0;
    }
  }

  private static prometheusARN(queueARN: ARN): string {
    return queueARN.replace(/:/g, '_');
  }

  get eventStats(): Record<string, unknown> {
    const priorityStats = JSON.parse(JSON.stringify(SQSManager.DEFAULT_PRIORITIES)) as SQSPriorities;
    const queueARNs = this._eventQueue.queueARNs();
    queueARNs.forEach((queueARN: ARN) => {
      Object.values(this._eventQueue.eventIds(queueARN)).forEach((event: EventItem) => {
        if (!priorityStats[queueARN]) {
          priorityStats[queueARN] = { PRIORITY_TOTAL: 0 };
        }
        const statKey = `PRIORITY_${event.priority}`;
        SQSManager.DEFAULT_PRIORITIES[statKey] = 0;
        if (!SQSManager.DEFAULT_PRIORITIES[queueARN]) {
          SQSManager.DEFAULT_PRIORITIES[queueARN] = { PRIORITY_TOTAL: 0 };
        }
        SQSManager.DEFAULT_PRIORITIES[queueARN][statKey] = 0;

        priorityStats[queueARN][statKey] = (priorityStats[queueARN][statKey] || 0) + 1;
        (priorityStats[queueARN] as SQSPriorities).PRIORITY_TOTAL += 1;
        priorityStats[statKey] = (priorityStats[statKey] as number || 0) + 1;
        priorityStats.PRIORITY_TOTAL += 1;
      });
    });
    return priorityStats;
  }

  prometheus(time: Date = new Date()): string {
    const unixTimeStamp = time.getTime();
    const prometheusRows = [];
    const priorityStats = this.eventStats;
    Object.keys(priorityStats).forEach((queueARN: string) => {
      if (typeof priorityStats[queueARN] === 'object') {
        const priorityStatsQueueARN = priorityStats[queueARN] as { [key: string]: number };
        Object.keys(priorityStatsQueueARN).forEach((key: string) => {
          prometheusRows.push(`${SQSManager.prometheusARN(queueARN)}_queue_priority{label="${key}"} ${
            priorityStatsQueueARN[key]} ${unixTimeStamp}`);
        });
        return;
      }
      prometheusRows.push(`queue_priority{label="${SQSManager.prometheusARN(queueARN)}"} ${
        priorityStats[queueARN] as number} ${unixTimeStamp}`);
    });
    return `${prometheusRows.sort().join('\n')}\n`;
  }

  constructor(sqsConfig: SQSConfig) {
    super();
    this._eventQueue = new SQSQueue();
    this._eventQueue.notifyNeedTaskURLS = sqsConfig.requestTasks || [];
    this._sQSStorageEngine = new SQSStorageEngine(sqsConfig.db);
    if (!sqsConfig.disableReceiveMessage) {
      this.storageToQueueWorker = new StorageToQueueWorker(this._sQSStorageEngine, this.addEventInQueueListener, sqsConfig.cronInterval);
    } else {
      SQSManager.DISABLE_RECEIVE_MESSAGE = true;
    }
  }

  comparatorFunction(queueARN: string, value: (event1: EventItem, event2: EventItem) => boolean): void {
    this._eventQueue.comparatorFunction(queueARN, value);
  }

  async poll(queue: Queue, visibilityTimeout: number): Promise<EventItem> {
    if (!this._eventQueue.size(queue.arn)) {
      await Promise.all(this._eventQueue.notifyNeedTaskURLS
        .map((url: string) => this.requestClient.http(url, { body: JSON.stringify({ arn: queue.arn }), json: true })))
        .catch((error: unknown) => {
          log.error(error);
        });
      return undefined;
    }
    const eventItem = this._eventQueue.popInitiate(queue.arn);
    await this._sQSStorageEngine.updateEventStateProcessing(queue, eventItem, visibilityTimeout, 'sent to slave');
    this._eventQueue.popComplete(eventItem);
    if (eventItem.eventTime.getTime() <= new Date().getTime()) {
      const event: EventItem = await this._sQSStorageEngine.findEvent(eventItem.id);
      if (event && event.receiveCount < event.maxReceiveCount) {
        this.addItemInQueue(event);
      }
    }
    return eventItem;
  }

  resetAll(resetOnlyStatistics?: boolean): void {
    SQSManager.DEFAULT_PRIORITIES = { PRIORITY_TOTAL: 0 };
    if (resetOnlyStatistics) {
      return;
    }
    this._eventQueue.resetAll();
  }

  async updateEvent(queue: Queue, event: EventItem): Promise<any> {
    await this._sQSStorageEngine.updateEvent(queue, event);
  }

  updateEventStateSuccess(queue: Queue, id: string, message: string): Promise<any> {
    return this._sQSStorageEngine.updateEventState(
      queue,
      id,
      EventItem.State.SUCCESS,
      { successResponse: message, completionPending: false });
  }

  async updateEventStateFailure(queue: Queue, id: string, message: string): Promise<any> {
    await this._sQSStorageEngine.updateEventState(queue, id, EventItem.State.FAILURE, { failureResponse: message });
  }

  listQueues(queueARNPrefix: ARN): Promise<Array<Queue>> {
    return this._sQSStorageEngine.listQueues(queueARNPrefix);
  }

  createQueue(
    user: User,
    queueName: string,
    region: string,
    attributes: Record<string, string>,
    tag: Record<string, string>): Promise<Queue> {
    return this._sQSStorageEngine.createQueue(user, queueName, region, attributes, tag);
  }

  getQueue(queueARN: ARN): Promise<Queue> {
    return this._sQSStorageEngine.getQueue(queueARN);
  }

  async deleteQueue(queue: Queue): Promise<void> {
    await this._sQSStorageEngine.deleteQueue(queue);
    this._eventQueue.reset(queue.arn);
    delete SQSManager.DEFAULT_PRIORITIES[queue.arn];
    if (Object.keys(SQSManager.DEFAULT_PRIORITIES).every((key: string) => key.startsWith('PRIORITY_'))) {
      SQSManager.DEFAULT_PRIORITIES = { PRIORITY_TOTAL: 0 };
    }
  }

  async sendMessage(
    queue: Queue,
    MessageBody: string,
    MessageAttribute: MessageAttributeMap,
    MessageSystemAttribute: MessageAttributeMap,
    DelaySeconds_?: string,
    MessageDeduplicationId?: string): Promise<EventItem> {
    const DelaySeconds = DelaySeconds_ || '0';
    const deliveryPolicy: ChannelDeliveryPolicy = DeliveryPolicyHelper
      .verifyAndGetChannelDeliveryPolicy(MessageAttribute?.DeliveryPolicy?.StringValue);
    const priority = isNaN(Number(MessageAttribute?.Priority?.StringValue))
      ? EventItem.PRIORITY.DEFAULT
      : Math.max(Math.min(Math.floor(Number(MessageAttribute?.Priority?.StringValue)), EventItem.PRIORITY.DEFAULT), 0);
    const eventItem = new EventItem({
      id: undefined,
      MessageAttribute,
      MessageSystemAttribute,
      MessageBody,
      queueARN: queue.arn,
      DeliveryPolicy: deliveryPolicy,
      MessageDeduplicationId,
      maxReceiveCount: queue.getMaxReceiveCount(MessageAttribute?.MaxReceiveCount?.StringValue),
      priority,
      eventTime: new Date(new Date().getTime() + (Number(DelaySeconds) * 1000)),
    });
    const inQueueEvent = this._eventQueue.findEventInQueue(queue.arn, eventItem);
    if (inQueueEvent) {
      return inQueueEvent;
    }
    const insertedEventItem = await this._sQSStorageEngine.addEventItem(queue, eventItem);
    if (SQSManager.DISABLE_RECEIVE_MESSAGE) {
      return insertedEventItem;
    }
    if (insertedEventItem.completionPending
      && !insertedEventItem.maxAttemptCompleted
      && (insertedEventItem.eventTime.getTime() <= new Date().getTime())) {
      this.addItemInQueue(insertedEventItem);
      await this._sQSStorageEngine.findEvent(insertedEventItem.id);
    }
    SQSManager.addToPriorities(queue.arn, insertedEventItem.priority);
    return insertedEventItem;
  }

  receiveMessage(queue: Queue, VisibilityTimeout: string = '30', MaxNumberOfMessages: string = '1'): Promise<Array<EventItem>> {
    return this.pollN(queue, Number(VisibilityTimeout), Number(MaxNumberOfMessages));
  }

  cancel(): void {
    if (!this.storageToQueueWorker) {
      return;
    }
    this.storageToQueueWorker.cancel();
  }

  getStorageEngine(): BaseStorageEngine {
    return this._sQSStorageEngine;
  }

  async findMessageById(queue: Queue, messageId: string): Promise<EventItem> {
    return this._sQSStorageEngine.findQueueEvent(queue, messageId);
  }

  async findMessageByDeduplicationId(queue: Queue, messageDeduplicationId: string): Promise<EventItem> {
    return this._sQSStorageEngine.findQueueEventByDeduplicationId(queue, messageDeduplicationId);
  }

  private async pollN(queue: Queue, visibilityTimeout: number, size: number): Promise<Array<EventItem>> {
    if (!size) {
      return [];
    }
    const response: EventItem = await this.poll(queue, visibilityTimeout);
    if (!response) {
      return [];
    }
    const responses = await this.pollN(queue, visibilityTimeout, size - 1);
    responses.unshift(response);
    return responses;
  }

  private addItemInQueue(eventItem: EventItem): void {
    if (this._eventQueue.isEventPresent(eventItem)) {
      return;
    }
    this._eventQueue.add(eventItem);
  }
}
