import { ClientConfiguration, CreateQueueRequest, CreateQueueResult, DeleteQueueRequest, GetQueueUrlRequest, GetQueueUrlResult, ListQueuesRequest, ListQueuesResult, ReceiveMessageRequest, ReceiveMessageResult, SendMessageBatchRequest, SendMessageBatchResult, SendMessageRequest, SendMessageResult } from '../request-response-types';
declare class SimpleQueueServerClient {
    private sqs;
    constructor(options: ClientConfiguration);
    listQueues(params?: ListQueuesRequest): Promise<ListQueuesResult>;
    createQueue(params: CreateQueueRequest): Promise<CreateQueueResult>;
    getQueueUrl(params: GetQueueUrlRequest): Promise<GetQueueUrlResult>;
    deleteQueue(params: DeleteQueueRequest): Promise<any>;
    sendMessage(params: SendMessageRequest): Promise<SendMessageResult>;
    receiveMessage(params: ReceiveMessageRequest): Promise<ReceiveMessageResult>;
    sendMessageBatch(params: SendMessageBatchRequest): Promise<SendMessageBatchResult>;
    markEventSuccess(MessageId: string, QueueUrl: string, successMessage?: string): Promise<void>;
    markEventFailure(MessageId: string, QueueUrl: string, failureMessage?: string): Promise<void>;
    private request;
}
export { SimpleQueueServerClient };
