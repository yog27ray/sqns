import { ARN, KeyValueString, MessageAttributeMap } from '../../../../typings/common';
import { SQSConfig } from '../../../../typings/config';
import { BaseManager } from '../../common/model/base-manager';
import { BaseStorageEngine } from '../../common/model/base-storage-engine';
import { EventItem } from '../../common/model/event-item';
import { Queue } from '../../common/model/queue';
import { User } from '../../common/model/user';
export declare class SQSManager extends BaseManager {
    static DEFAULT_PRIORITIES: {
        PRIORITY_TOTAL: number;
    };
    private requestClient;
    private readonly _sQSStorageEngine;
    private _eventQueue;
    private storageToQueueWorker;
    private static addToPriorities;
    private static prometheusARN;
    get eventStats(): {
        [key: string]: any;
    };
    prometheus(time?: Date): string;
    constructor(sqsConfig: SQSConfig);
    comparatorFunction(queueARN: string, value: (event1: EventItem, event2: EventItem) => boolean): void;
    poll(queue: Queue, visibilityTimeout: number): Promise<EventItem>;
    resetAll(resetOnlyStatistics?: boolean): void;
    updateEvent(queue: Queue, event: EventItem): Promise<any>;
    updateEventStateSuccess(queue: Queue, id: string, message: string): Promise<any>;
    updateEventStateFailure(queue: Queue, id: string, message: string): Promise<any>;
    listQueues(queueARNPrefix: ARN): Promise<Array<Queue>>;
    createQueue(user: User, queueName: string, region: string, attributes: KeyValueString, tag: KeyValueString): Promise<Queue>;
    getQueue(queueARN: ARN): Promise<Queue>;
    deleteQueue(queue: Queue): Promise<void>;
    sendMessage(queue: Queue, MessageBody: string, MessageAttribute: MessageAttributeMap, MessageSystemAttribute: MessageAttributeMap, DelaySeconds?: string, MessageDeduplicationId?: string): Promise<EventItem>;
    receiveMessage(queue: Queue, VisibilityTimeout?: string, MaxNumberOfMessages?: string): Promise<Array<EventItem>>;
    cancel(): void;
    getStorageEngine(): BaseStorageEngine;
    findMessageById(queue: Queue, messageId: string): Promise<EventItem>;
    findMessageByDeduplicationId(queue: Queue, messageDeduplicationId: string): Promise<EventItem>;
    private pollN;
    private addEventInQueueListener;
    private addItemInQueue;
}