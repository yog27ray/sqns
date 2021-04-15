import { BASE_CONFIG } from '../../../../typings/typings';
import { SQNSClientConfig } from '../../../../typings/client-confriguation';
import { ManagerQueueConfigListener } from '../../../../typings/config';
export declare class ManagerEventScheduler {
    private readonly queueNames;
    private job;
    private readonly queueConfigs;
    private client;
    constructor(options: SQNSClientConfig, queueBaseParams: {
        [key: string]: BASE_CONFIG;
    }, listener: ManagerQueueConfigListener, cronInterval?: string);
    cancel(): void;
    private findOrCreateQueue;
    private initialize;
    private requestEventsToAddInQueueAsynchronous;
    private requestEventsToAddInQueue;
}
