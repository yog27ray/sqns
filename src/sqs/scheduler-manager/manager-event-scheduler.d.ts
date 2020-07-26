import SQS from 'aws-sdk/clients/sqs';
import { RequestItem } from '../request-response-types/request-item';
declare class ManagerEventScheduler {
    private queueName;
    private job;
    private config;
    private client;
    private queue;
    constructor(options: SQS.ClientConfiguration, queueName: string, baseParams: {
        [key: string]: any;
    }, listener: (nextItemListParams: any) => Promise<[{
        [key: string]: any;
    }, Array<RequestItem>]>, cronInterval?: string);
    cancel(): void;
    private findOrCreateQueue;
    private initialize;
    private get cloneBaseParams();
    private requestEventsToAddInQueue;
    private addEventsToQueue;
}
export { ManagerEventScheduler };
