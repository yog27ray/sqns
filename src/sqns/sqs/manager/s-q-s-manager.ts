import { ARN, KeyValueString, MessageAttributeMap } from '../../../../typings/common';
import { SQSConfig } from '../../../../typings/config';
import { ChannelDeliveryPolicy } from '../../../../typings/delivery-policy';
import { DeliveryPolicyHelper } from '../../common/helper/delivery-policy-helper';
import { logger } from '../../common/logger/logger';
import { BaseManager } from '../../common/model/base-manager';
import { BaseStorageEngine } from '../../common/model/base-storage-engine';
import { EventItem } from '../../common/model/event-item';
import { Queue } from '../../common/model/queue';
import { User } from '../../common/model/user';
import { RequestClient } from '../../common/request-client/request-client';
import { StorageToQueueWorker } from '../worker/storage-to-queue-worker';
import { SQSQueue } from './s-q-s-queue';
import { SQSStorageEngine } from './s-q-s-storage-engine';

const log = logger.instance('EventManager');

export class SQSManager extends BaseManager {
  static DEFAULT_PRIORITIES = { PRIORITY_TOTAL: 0 };

  private requestClient = new RequestClient();

  private readonly _sQSStorageEngine: SQSStorageEngine;

  private _eventQueue: SQSQueue;

  private storageToQueueWorker: StorageToQueueWorker;

  private static addToPriorities(queueARN: ARN, priority: number): void {
    const statKey = `PRIORITY_${priority}`;
    if (isNaN(SQSManager.DEFAULT_PRIORITIES[statKey])) {
      SQSManager.DEFAULT_PRIORITIES[statKey] = 0;
    }
    if (!SQSManager.DEFAULT_PRIORITIES[queueARN]) {
      SQSManager.DEFAULT_PRIORITIES[queueARN] = { PRIORITY_TOTAL: 0 };
    }
    if (isNaN(SQSManager.DEFAULT_PRIORITIES[queueARN][statKey])) {
      SQSManager.DEFAULT_PRIORITIES[queueARN][statKey] = 0;
    }
  }

  private static prometheusARN(queueARN: ARN): string {
    return queueARN.replace(new RegExp(':', 'g'), '_');
  }

  get eventStats(): { [key: string]: any } {
    const priorityStats = JSON.parse(JSON.stringify(SQSManager.DEFAULT_PRIORITIES)) as { [key: string]: any };
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

        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        priorityStats[queueARN][statKey] = (priorityStats[queueARN][statKey] || 0) + 1;
        priorityStats[queueARN].PRIORITY_TOTAL += 1;
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        priorityStats[statKey] = (priorityStats[statKey] || 0) + 1;
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
    this.storageToQueueWorker = new StorageToQueueWorker(this._sQSStorageEngine, this.addEventInQueueListener, sqsConfig.cronInterval);
  }

  comparatorFunction(queueARN: string, value: (event1: EventItem, event2: EventItem) => boolean): void {
    this._eventQueue.comparatorFunction(queueARN, value);
  }

  async poll(queue: Queue, visibilityTimeout: number): Promise<EventItem> {
    if (!this._eventQueue.size(queue.arn)) {
      await Promise.all(this._eventQueue.notifyNeedTaskURLS
        .map((url: string) => this.requestClient.post(url, { body: JSON.stringify({ arn: queue.arn }), json: true })))
        .catch((error: any) => {
          log.error(error);
        });
      return undefined;
    }
    const eventItem = this._eventQueue.pop(queue.arn);
    await this._sQSStorageEngine.updateEventStateProcessing(queue, eventItem, visibilityTimeout, 'sent to slave');
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
    return this._sQSStorageEngine.updateEventState(queue, id, EventItem.State.SUCCESS, { successResponse: message });
  }

  async updateEventStateFailure(queue: Queue, id: string, message: string): Promise<any> {
    await this._sQSStorageEngine.updateEventState(queue, id, EventItem.State.FAILURE, { failureResponse: message });
  }

  listQueues(queueARNPrefix: ARN): Promise<Array<Queue>> {
    return this._sQSStorageEngine.listQueues(queueARNPrefix);
  }

  createQueue(user: User, queueName: string, region: string, attributes: KeyValueString, tag: KeyValueString): Promise<Queue> {
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

  async sendMessage(queue: Queue, MessageBody: string, MessageAttribute: MessageAttributeMap, MessageSystemAttribute: MessageAttributeMap,
    DelaySeconds: string = '0', MessageDeduplicationId?: string): Promise<EventItem> {
    this.storageToQueueWorker.setUpIntervalForQueue(queue);
    const DeliveryPolicy: ChannelDeliveryPolicy = DeliveryPolicyHelper
      .verifyAndGetChannelDeliveryPolicy(MessageAttribute?.DeliveryPolicy?.StringValue, true) || queue.DeliveryPolicy;
    const eventItem = new EventItem({
      id: undefined,
      MessageAttribute,
      MessageSystemAttribute,
      MessageBody,
      queueARN: queue.arn,
      DeliveryPolicy,
      MessageDeduplicationId,
      maxReceiveCount: queue.getMaxReceiveCount(),
      eventTime: new Date(new Date().getTime() + (Number(DelaySeconds) * 1000)),
    });
    const inQueueEvent = this._eventQueue.findEventInQueue(queue.arn, eventItem);
    if (inQueueEvent) {
      return inQueueEvent;
    }
    const insertedEventItem = await this._sQSStorageEngine.addEventItem(queue, eventItem);
    if (insertedEventItem.eventTime.getTime() <= new Date().getTime()) {
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
    this.storageToQueueWorker.cancel();
  }

  getStorageEngine(): BaseStorageEngine {
    return this._sQSStorageEngine;
  }

  async findMessageById(queue: Queue, messageId: string): Promise<EventItem> {
    return this._sQSStorageEngine.findQueueEvent(queue, messageId);
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

  private addEventInQueueListener: (item: EventItem) => void = (item: EventItem) => {
    this.addItemInQueue(item);
  }

  private addItemInQueue(eventItem: EventItem): void {
    if (this._eventQueue.isEventPresent(eventItem)) {
      return;
    }
    this._eventQueue.add(eventItem);
  }
}
