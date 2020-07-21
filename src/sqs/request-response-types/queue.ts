import { QueueAttributeMap, TagMap } from 'aws-sdk/clients/sqs';

interface CreateQueueRequest {
  QueueName: string;
  Attributes?: QueueAttributeMap;
  tags?: TagMap;
}

interface CreateQueueResult {
  QueueUrl?: string;
}

interface GetQueueUrlRequest {
  QueueName: string;
}

interface GetQueueUrlResult {
  QueueUrl?: string;
}

interface DeleteQueueRequest {
  QueueUrl: string;
}

export { CreateQueueRequest, CreateQueueResult, GetQueueUrlRequest, GetQueueUrlResult, DeleteQueueRequest };
