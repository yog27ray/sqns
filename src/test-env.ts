import { SimpleQueueServerClient } from './sqs/aws';

const Env = {
  URL: 'http://localhost:1234',
  PORT: 1234,
  region: 'testRegion',
  accessKeyId: 'accessKeyIdTest',
  secretAccessKey: 'secretAccessKeyTest',
};

async function deleteQueues(client: SimpleQueueServerClient): Promise<any> {
  const { QueueUrls } = await client.listQueues();
  await Promise.all(QueueUrls.map((QueueUrl: string) => client.deleteQueue({ QueueUrl }).catch(() => 0)));
}

function deleteDynamicDataOfResults(items_: any): void {
  const items = items_;
  delete items.ResponseMetadata;
  items.Messages.forEach((each_: any) => {
    const each = each_;
    delete each.MessageId;
    delete each.ReceiptHandle;
  });
}

export { Env, deleteQueues, deleteDynamicDataOfResults };
