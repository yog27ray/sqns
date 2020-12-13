import { SNSClient } from './sqns/sns/s-n-s-client';
import { SQSClient } from './sqns/sqs/s-q-s-client';

const Env = {
  URL: 'http://127.0.0.1:1234',
  PORT: 1234,
  companyId: '12345',
  region: 'testRegion',
  accessKeyId: 'accessKeyIdTest',
  secretAccessKey: 'secretAccessKeyTest',
};

async function findAllTopics(client: SNSClient, nextToken?: string): Promise<Array<string>> {
  const listTopicsResponse = await client.listTopics({ NextToken: nextToken });
  const topics = listTopicsResponse.Topics.map(({ TopicArn }: { TopicArn: string }) => TopicArn);
  if (listTopicsResponse.NextToken) {
    const allTopics = await findAllTopics(client, listTopicsResponse.NextToken);
    topics.push(...allTopics);
  }
  return topics;
}

async function findAllQueues(client: SQSClient, nextToken?: string): Promise<Array<string>> {
  const listQueuesResponse = await client.listQueues({ NextToken: nextToken });
  const queueUrls = listQueuesResponse.QueueUrls;
  if (listQueuesResponse.NextToken) {
    const allQueueURLs = await findAllQueues(client, listQueuesResponse.NextToken);
    queueUrls.push(...allQueueURLs);
  }
  return queueUrls;
}

async function deleteTopics(client: SNSClient): Promise<void> {
  const topicARNs = await findAllTopics(client);
  await Promise.all(topicARNs.map((topicARN: string) => client.deleteTopic({ TopicArn: topicARN })));
}

async function deleteAllQueues(client: SQSClient): Promise<void> {
  const queueURLs = await findAllQueues(client);
  await Promise.all(queueURLs.map((queueURL: string) => client.deleteQueue({ QueueUrl: queueURL })));
}

function deleteDynamicDataOfResults(items_: { [key: string]: any }): void {
  const items = items_;
  delete items.ResponseMetadata;
  items.Messages.forEach((each_: any) => {
    const each = each_;
    delete each.MessageId;
    delete each.ReceiptHandle;
  });
}

export { Env, deleteDynamicDataOfResults, deleteTopics, deleteAllQueues };
