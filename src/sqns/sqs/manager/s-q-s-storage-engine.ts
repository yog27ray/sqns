import { ARN } from '../../../../typings';
import { KeyValueString } from '../../../../typings/common';
import { SQNSError } from '../../common/auth/s-q-n-s-error';
import { DeliveryPolicyHelper } from '../../common/helper/delivery-policy-helper';
import { BaseStorageEngine } from '../../common/model/base-storage-engine';
import { EventItem, EventState } from '../../common/model/event-item';
import { Queue } from '../../common/model/queue';
import { User } from '../../common/model/user';

class SQSStorageEngine extends BaseStorageEngine {
  addEventItem(queue: Queue, eventItem: EventItem): Promise<EventItem> {
    return this._storageAdapter.addEventItem(queue, eventItem);
  }

  async getQueueARNs(): Promise<Array<ARN>> {
    const queues = await this._storageAdapter.getQueues();
    return queues.map((queue: Queue) => queue.arn);
  }

  findEventsToProcess(queues: Array<Queue>, time: Date, limit: number): Promise<Array<EventItem>> {
    return this._storageAdapter.findEventsToProcess(queues, time, limit);
  }

  async updateEventStateProcessing(queue: Queue, eventItem_: EventItem, visibilityTimeout: number, message: string): Promise<any> {
    const eventItem = eventItem_;
    eventItem.updateSentTime(new Date());
    eventItem.incrementReceiveCount();
    const effectiveDeliveryPolicy = eventItem.DeliveryPolicy || queue.DeliveryPolicy;
    eventItem.eventTime = DeliveryPolicyHelper
      .calculateNewEventTime(new Date(), effectiveDeliveryPolicy, { attempt: eventItem.receiveCount, minDelay: visibilityTimeout });
    await this._storageAdapter.updateEvent(
      eventItem.id,
      {
        state: EventItem.State.PROCESSING.valueOf(),
        processingResponse: message,
        receiveCount: eventItem.receiveCount,
        firstSentTime: eventItem.firstSentTime,
        sentTime: eventItem.sentTime,
        eventTime: eventItem.eventTime,
      });
  }

  async updateEventState(queue: Queue, id: string, state: EventState, message: { [key: string]: any }): Promise<any> {
    const event = await this._storageAdapter.findById(id);
    if (!event || !queue || event.queueARN !== queue.arn) {
      return;
    }
    await this._storageAdapter.updateEvent(id, { ...message, state: state.valueOf() });
  }

  listQueues(queueARNPrefix: ARN): Promise<Array<Queue>> {
    return this._storageAdapter.getQueues(queueARNPrefix);
  }

  createQueue(user: User, queueName: string, region: string, attributes: KeyValueString, tag: KeyValueString): Promise<Queue> {
    return this._storageAdapter.createQueue(user, queueName, region, attributes, tag);
  }

  async getQueue(queueARN: ARN): Promise<Queue> {
    const queue = await this._storageAdapter.getQueue(queueARN);
    if (!queue) {
      SQNSError.invalidQueueName(queueARN);
    }
    return queue;
  }

  async deleteQueue(queue: Queue): Promise<void> {
    return this._storageAdapter.deleteQueue(queue);
  }

  findEvent(id: string): Promise<EventItem> {
    return this._storageAdapter.findById(id);
  }
}

export { SQSStorageEngine };
