import { ARN, EventItem, EventState } from '../../../client';
import { SQNSErrorCreator } from '../../common/auth/s-q-n-s-error-creator';
import { DeliveryPolicyHelper } from '../../common/helper/delivery-policy-helper';
import { BaseStorageEngine } from '../../common/model/base-storage-engine';
import { Queue } from '../../common/model/queue';
import { User } from '../../common/model/user';

class SQSStorageEngine extends BaseStorageEngine {
  addEventItem(queue: Queue, eventItem: EventItem): Promise<EventItem> {
    return this._storageAdapter.addEventItem(queue, eventItem);
  }

  findEventsToProcess(time: Date, limit: number): Promise<Array<EventItem>> {
    return this._storageAdapter.findEventsToProcess(time, limit);
  }

  async updateEventStateProcessing(queue: Queue, eventItem_: EventItem, visibilityTimeout: number, message: string): Promise<any> {
    const eventItem = eventItem_;
    eventItem.updateSentTime(new Date());
    eventItem.incrementReceiveCount();
    const effectiveDeliveryPolicy = eventItem.DeliveryPolicy
      || queue.DeliveryPolicy
      || DeliveryPolicyHelper.DEFAULT_DELIVERY_POLICY.default.defaultHealthyRetryPolicy;
    eventItem.eventTime = DeliveryPolicyHelper.calculateNewEventTime(
      new Date(),
      effectiveDeliveryPolicy,
      { attempt: eventItem.receiveCount, minDelay: visibilityTimeout || effectiveDeliveryPolicy.minDelayTarget });
    await this._storageAdapter.updateEvent(
      eventItem.id,
      {
        state: EventItem.State.PROCESSING.valueOf(),
        processingResponse: message,
        firstSentTime: eventItem.firstSentTime,
        maxAttemptCompleted: eventItem.maxAttemptCompleted,
        sentTime: eventItem.sentTime,
        eventTime: eventItem.eventTime,
      }, { receiveCount: 1 });
  }

  async updateEvent(queue: Queue, eventItem: EventItem): Promise<any> {
    const event = await this._storageAdapter.findById(eventItem.id);
    if (!event || !queue || event.queueARN !== queue.arn) {
      return;
    }
    await this._storageAdapter.updateEvent(eventItem.id, { ...eventItem.toJSON() });
  }

  async updateEventState(queue: Queue, id: string, state: EventState, message: Record<string, unknown>): Promise<any> {
    const event = await this._storageAdapter.findById(id);
    if (!event || !queue || event.queueARN !== queue.arn) {
      return;
    }
    await this._storageAdapter.updateEvent(id, { ...message, state: state.valueOf() });
  }

  listQueues(queueARNPrefix: ARN): Promise<Array<Queue>> {
    return this._storageAdapter.getQueues(queueARNPrefix);
  }

  createQueue(
    user: User,
    queueName: string,
    region: string,
    attributes: Record<string, string>,
    tag: Record<string, string>): Promise<Queue> {
    return this._storageAdapter.createQueue(user, queueName, region, attributes, tag);
  }

  async getQueue(queueARN: ARN): Promise<Queue> {
    const queue = await this._storageAdapter.getQueue(queueARN);
    if (!queue) {
      SQNSErrorCreator.invalidQueueName(queueARN);
    }
    return queue;
  }

  async deleteQueue(queue: Queue): Promise<void> {
    return this._storageAdapter.deleteQueue(queue);
  }

  findEvent(id: string): Promise<EventItem> {
    return this._storageAdapter.findById(id);
  }

  findQueueEvent(queue: Queue, messageId: string): Promise<EventItem> {
    return this._storageAdapter.findByIdForQueue(queue, messageId);
  }

  findQueueEventByDeduplicationId(queue: Queue, messageDeduplicationId: string): Promise<EventItem> {
    return this._storageAdapter.findByDeduplicationIdForQueue(queue, messageDeduplicationId);
  }
}

export { SQSStorageEngine };
