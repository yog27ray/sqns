import { ARN, KeyValueString } from '../../../../typings/common';
import { BaseStorageEngine } from '../../common/model/base-storage-engine';
import { EventItem, EventState } from '../../common/model/event-item';
import { Queue } from '../../common/model/queue';
import { User } from '../../common/model/user';
declare class SQSStorageEngine extends BaseStorageEngine {
    addEventItem(queue: Queue, eventItem: EventItem): Promise<EventItem>;
    findEventsToProcess(queues: Array<Queue>, time: Date, limit: number): Promise<Array<EventItem>>;
    updateEventStateProcessing(queue: Queue, eventItem_: EventItem, visibilityTimeout: number, message: string): Promise<any>;
    updateEvent(queue: Queue, eventItem: EventItem): Promise<any>;
    updateEventState(queue: Queue, id: string, state: EventState, message: {
        [key: string]: any;
    }): Promise<any>;
    listQueues(queueARNPrefix: ARN): Promise<Array<Queue>>;
    createQueue(user: User, queueName: string, region: string, attributes: KeyValueString, tag: KeyValueString): Promise<Queue>;
    getQueue(queueARN: ARN): Promise<Queue>;
    deleteQueue(queue: Queue): Promise<void>;
    findEvent(id: string): Promise<EventItem>;
    findQueueEvent(queue: Queue, messageId: string): Promise<EventItem>;
}
export { SQSStorageEngine };
