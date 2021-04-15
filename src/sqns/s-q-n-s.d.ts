import { Express } from 'express';
import { ARN } from '../../typings';
import { SQNSConfig } from '../../typings/config';
import { EventItem } from './common/model/event-item';
export declare class SQNS {
    private readonly _url;
    private readonly region;
    private readonly sqsManager;
    private readonly snsManager;
    constructor(config: SQNSConfig);
    queueComparator(queueARN: ARN, value: (event1: EventItem, event2: EventItem) => boolean): void;
    registerExpressRoutes(app: Express): void;
    resetAll(): Promise<void>;
    cancel(): void;
}
