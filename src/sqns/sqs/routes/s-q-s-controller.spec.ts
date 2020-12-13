import SQS from 'aws-sdk/clients/sqs';
import { expect } from 'chai';
import rp from 'request-promise';
import { delay, dropDatabase } from '../../../setup';
import { deleteDynamicDataOfResults, Env } from '../../../test-env';
import { SYSTEM_QUEUE_NAME } from '../../common/helper/common';
import { SQSClient } from '../s-q-s-client';

describe('EventManagerMasterSpec', () => {
  context('errorHandling', () => {
    let client: SQSClient;
    before(async () => {
      await dropDatabase();
      client = new SQSClient({});
      client = new SQSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: 'invalidKey',
        secretAccessKey: 'invalidAccessKey',
        maxRetries: 0,
      });
    });

    it('should give error when client credentials are wrong.', async () => {
      try {
        await client.createQueue({ QueueName: 'queue1' });
        await Promise.reject({ code: 99, message: 'should not reach here.' });
      } catch (error) {
        const { code, message } = error;
        expect({ code, message }).to.deep.equal({
          code: 'SignatureDoesNotMatch',
          message: 'The request signature we calculated does not match the signature you provided.',
        });
      }
    });

    it('should give error when client credentials are wrong for listQueues.', async () => {
      try {
        await client.listQueues({});
        await Promise.reject({ code: 99, message: 'should not reach here.' });
      } catch (error) {
        const { code, message } = error;
        expect({ code, message }).to.deep.equal({
          code: 'SignatureDoesNotMatch',
          message: 'The request signature we calculated does not match the signature you provided.',
        });
      }
    });

    it('should give error function is not supported.', async () => {
      try {
        const sqs = new SQS({
          region: Env.region,
          endpoint: `${Env.URL}/api/sqs`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
          maxRetries: 0,
        });
        await new Promise((resolve: (value?: unknown) => void, reject: (e: Error) => void) => {
          sqs.addPermission({
            QueueUrl: `${Env.URL}/api/sqs/testRegion/1/queue1`,
            Label: 'label',
            AWSAccountIds: ['accountIds'],
            Actions: ['testAction'],
          }, (error: any) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        });
        await Promise.reject({ code: 99, message: 'should not reach here.' });
      } catch (error) {
        const { code, message } = error;
        expect({ code, message }).to.deep.equal({
          code: 'Unhandled function',
          message: 'This function is not supported.',
        });
      }
    });
  });

  context('createQueue', () => {
    let client: SQSClient;
    before(async () => {
      await dropDatabase();
      client = new SQSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
    });

    it('should create queue1', async () => {
      const result = await client.createQueue({
        QueueName: 'queue1',
        Attributes: { attribute: 'attribute1' },
        tags: { tag: 'tag1' },
      });
      expect(result.QueueUrl).to.equal(`${Env.URL}/api/sqs/testRegion/1/queue1`);
    });

    it('should allow request create same queue multiple times', async () => {
      await client.createQueue({ QueueName: 'queue1' });
      const result = await client.createQueue({ QueueName: 'queue1' });
      expect(result.QueueUrl).to.equal(`${Env.URL}/api/sqs/testRegion/1/queue1`);
    });
  });

  context('getQueueUrl', () => {
    let client: SQSClient;
    let queue: SQS.Types.CreateQueueResult;
    before(async () => {
      await dropDatabase();
      client = new SQSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      queue = await client.createQueue({ QueueName: 'queue1' });
    });

    it('should give error when queue doesn\'t exists.', async () => {
      try {
        await client.getQueueUrl({ QueueName: 'queue11' });
        await Promise.reject({ code: 99, message: 'should not reach here.' });
      } catch (error) {
        expect(error.code).to.equal('NonExistentQueue');
        expect(error.message).to.equal('The specified "queue11" queue does not exist.');
      }
    });

    it('should return queue1 url', async () => {
      const result = await client.getQueueUrl({ QueueName: 'queue1' });
      expect(result.QueueUrl).to.equal(`${Env.URL}/api/sqs/testRegion/1/queue1`);
    });
  });

  context('deleteQueue', () => {
    let client: SQSClient;
    let queue: SQS.Types.CreateQueueResult;
    before(async () => {
      await dropDatabase();
      client = new SQSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      queue = await client.createQueue({ QueueName: 'queue1' });
    });

    it('should give error when deleting system queue.', async () => {
      try {
        await client.deleteQueue({ QueueUrl: `${Env.URL}/api/sqs/${SYSTEM_QUEUE_NAME.SNS}` });
        await Promise.reject({ code: 99, message: 'should not reach here.' });
      } catch (error) {
        const { code, message } = error;
        expect({ code, message }).to.deep.equal({ code: 'ReservedQueueName', message: 'Reserved queue name' });
      }
    });

    it('should give error when queue doesn\'t exists.', async () => {
      try {
        await client.deleteQueue({ QueueUrl: `${Env.URL}/api/sqs/queue11` });
        await Promise.reject({ code: 99, message: 'should not reach here.' });
      } catch (error) {
        expect(error.code).to.equal('NonExistentQueue');
        expect(error.message).to.equal('The specified "queue11" queue does not exist.');
      }
    });

    it('should delete queue queue1', async () => {
      try {
        await client.deleteQueue({ QueueUrl: queue.QueueUrl });
        await client.getQueueUrl({ QueueName: 'queue1' });
        await Promise.reject({ code: 99, message: 'should not reach here.' });
      } catch (error) {
        expect(error.code).to.equal('NonExistentQueue');
        expect(error.message).to.equal('The specified "queue1" queue does not exist.');
      }
    });

    it('should delete fifo queue queue1.fifo', async () => {
      try {
        queue = await client.createQueue({ QueueName: 'queue1.fifo' });
        await client.deleteQueue({ QueueUrl: queue.QueueUrl });
        await client.getQueueUrl({ QueueName: 'queue1.fifo' });
        await Promise.reject({ code: 99, message: 'should not reach here.' });
      } catch (error) {
        expect(error.code).to.equal('NonExistentQueue');
        expect(error.message).to.equal('The specified "queue1.fifo" queue does not exist.');
      }
    });
  });

  context('listQueues', () => {
    let client: SQSClient;
    before(async () => {
      await dropDatabase();
      client = new SQSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      await client.createQueue({ QueueName: '1queue1' });
      await client.createQueue({ QueueName: '1queue2' });
      await client.createQueue({ QueueName: '2queue3' });
    });

    it('should return list of all queues', async () => {
      const list = await client.listQueues();
      expect(list.QueueUrls).to.deep.equal([
        `${Env.URL}/api/sqs/testRegion/1/1queue1`,
        `${Env.URL}/api/sqs/testRegion/1/1queue2`,
        `${Env.URL}/api/sqs/testRegion/1/2queue3`,
      ]);
    });

    it('should return list of all queues starting with "1q"', async () => {
      const list = await client.listQueues({ QueueNamePrefix: '1q' });
      expect(list.QueueUrls).to.deep.equal([
        `${Env.URL}/api/sqs/testRegion/1/1queue1`,
        `${Env.URL}/api/sqs/testRegion/1/1queue2`,
      ]);
    });
  });

  context('SendMessage', () => {
    let client: SQSClient;
    let queue: SQS.Types.CreateQueueResult;
    beforeEach(async () => {
      await dropDatabase();
      client = new SQSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      queue = await client.createQueue({ QueueName: 'queue1' });
    });

    it('should give error when queue doesn\'t exists.', async () => {
      try {
        await client.sendMessage({ QueueUrl: `${queue.QueueUrl}1`, MessageBody: '123' });
        await Promise.reject({ code: 99, message: 'should not reach here.' });
      } catch (error) {
        expect(error.code).to.equal('NonExistentQueue');
        expect(error.message).to.equal('The specified "queue11" queue does not exist.');
      }
    });

    it('should add new event in the queue1', async () => {
      const result = await client.sendMessage({
        QueueUrl: queue.QueueUrl,
        MessageAttributes: { type: { StringValue: 'type1', DataType: 'String' } },
        MessageDeduplicationId: 'uniqueId1',
        MessageBody: '123',
      });
      expect(result.MD5OfMessageBody).to.equal('202cb962ac59075b964b07152d234b70');
      expect(result.MD5OfMessageAttributes).to.equal('8bd349963828b39106dd3a35071ccee6');
      expect(result.MessageId).to.exist;
    });

    it('should not add same event twice in queue1', async () => {
      let result = await client.sendMessage({
        QueueUrl: queue.QueueUrl,
        MessageAttributes: { type: { StringValue: 'type1', DataType: 'String' } },
        MessageDeduplicationId: 'uniqueId1',
        MessageBody: '123',
      });
      const firstMessageId = result.MessageId;
      result = await client.sendMessage({
        QueueUrl: queue.QueueUrl,
        MessageAttributes: { type: { StringValue: 'type1', DataType: 'String' } },
        MessageDeduplicationId: 'uniqueId1',
        MessageBody: '123',
      });
      expect(firstMessageId).to.equal(result.MessageId);
      const messages = await client.receiveMessage({
        QueueUrl: queue.QueueUrl,
        MaxNumberOfMessages: 10,
        MessageAttributeNames: ['ALL'],
      });
      expect(messages.Messages.length).to.equal(1);
      expect(messages.Messages[0].MessageId).to.equal('uniqueId1');
      expect(messages.Messages[0].ReceiptHandle).to.exist;
      deleteDynamicDataOfResults(messages);
      expect(messages).to.deep.equal({
        Messages: [{
          MD5OfBody: '202cb962ac59075b964b07152d234b70',
          Body: '123',
          MessageAttributes: {
            type: {
              StringValue: 'type1',
              BinaryListValues: [],
              StringListValues: [],
              DataType: 'String',
            },
          },
        }],
      });
    });
  });

  context('sendMessageBatch', () => {
    let client: SQSClient;
    let queue: SQS.Types.CreateQueueResult;
    before(async () => {
      await dropDatabase();
      client = new SQSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      queue = await client.createQueue({ QueueName: 'queue1' });
    });

    it('should give error when queue doesn\'t exists.', async () => {
      try {
        await client.sendMessageBatch({
          QueueUrl: `${queue.QueueUrl}1`,
          Entries: [{ Id: '123', MessageBody: '123' }, { Id: '1234', MessageBody: '1234' }],
        });
        await Promise.reject({ code: 99, message: 'should not reach here.' });
      } catch (error) {
        expect(error.code).to.equal('NonExistentQueue');
        expect(error.message).to.equal('The specified "queue11" queue does not exist.');
      }
    });

    it('should add new events in the queue1', async () => {
      const results = await client.sendMessageBatch({
        QueueUrl: queue.QueueUrl,
        Entries: [{ Id: '123', MessageBody: '123' }, { Id: '1234', MessageBody: '1234' }],
      });
      expect(results.Successful.length).to.equal(2);
      expect(results.Successful[0].Id).to.equal('123');
      expect(results.Successful[0].MD5OfMessageBody).to.equal('202cb962ac59075b964b07152d234b70');
      expect(results.Successful[0].MD5OfMessageAttributes).to.equal('d41d8cd98f00b204e9800998ecf8427e');
      expect(results.Successful[0].MessageId).to.exist;
      expect(results.Successful[1].Id).to.equal('1234');
      expect(results.Successful[1].MD5OfMessageBody).to.equal('81dc9bdb52d04dc20036dbd8313ed055');
      expect(results.Successful[1].MD5OfMessageAttributes).to.equal('d41d8cd98f00b204e9800998ecf8427e');
      expect(results.Successful[1].MessageId).to.exist;
      expect(results.Failed.length).to.equal(0);
    });
  });

  context('receiveMessage', () => {
    let client: SQSClient;
    let queue: SQS.Types.CreateQueueResult;
    before(async () => {
      await dropDatabase();
      client = new SQSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      queue = await client.createQueue({ QueueName: 'queue1' });
      await client.sendMessageBatch({
        QueueUrl: queue.QueueUrl,
        Entries: [
          { Id: '123', MessageBody: '123' },
          { Id: '1234', MessageBody: '1234' },
          { Id: '1235', MessageBody: '1235' },
        ],
      });
      await delay();
    });

    it('should give error when queue doesn\'t exists.', async () => {
      try {
        await client.receiveMessage({ QueueUrl: `${queue.QueueUrl}1` });
        await Promise.reject({ code: 99, message: 'should not reach here.' });
      } catch (error) {
        expect(error.code).to.equal('NonExistentQueue');
        expect(error.message).to.equal('The specified "queue11" queue does not exist.');
      }
    });

    it('should find one event in the queue1', async () => {
      const { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl });
      expect(Messages.length).to.equal(1);
      expect(Messages[0].MessageId).to.exist;
      expect(Messages[0].ReceiptHandle).to.exist;
      expect(Messages[0].Body).to.exist;
      expect(Messages[0].MD5OfBody).to.exist;
    });

    it('should find two event in the queue1', async () => {
      const { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MaxNumberOfMessages: 2 });
      expect(Messages.length).to.equal(2);
      expect(Messages[0].MessageId).to.exist;
      expect(Messages[0].ReceiptHandle).to.exist;
      expect(Messages[0].Body).to.exist;
      expect(Messages[0].MD5OfBody).to.exist;
      expect(Messages[1].MessageId).to.exist;
      expect(Messages[1].ReceiptHandle).to.exist;
      expect(Messages[1].Body).to.exist;
      expect(Messages[1].MD5OfBody).to.exist;
    });

    it('should find no event in the queue2', async () => {
      const queue2 = await client.createQueue({ QueueName: 'queue2' });
      const { Messages } = await client.receiveMessage({ QueueUrl: queue2.QueueUrl });
      expect(Messages.length).to.equal(0);
    });
  });

  context('eventStats', () => {
    let client: SQSClient;
    let queue1: SQS.Types.CreateQueueResult;
    let queue2: SQS.Types.CreateQueueResult;
    before(async () => {
      await dropDatabase();
      client = new SQSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      queue1 = await client.createQueue({ QueueName: 'queue1' });
      queue2 = await client.createQueue({ QueueName: 'queue2' });
      await client.sendMessageBatch({
        QueueUrl: queue1.QueueUrl,
        Entries: [{ Id: '123', MessageBody: 'type1' }, { Id: '1234', MessageBody: 'type2' }],
      });
      await client.sendMessageBatch({
        QueueUrl: queue2.QueueUrl,
        Entries: [
          { Id: '123', MessageBody: 'type1' },
          { Id: '1234', MessageBody: 'type2' },
          { Id: '1224', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '1', DataType: 'String' } } },
        ],
      });
      await delay();
    });

    it('should return current event status', async () => {
      const stats = await rp({ uri: `${Env.URL}/api/queues/events/stats`, json: true });
      expect(stats).to.deep.equal({
        PRIORITY_TOTAL: 5,
        'arn:sqns:sqs:testRegion:1:queue1': { PRIORITY_TOTAL: 2, PRIORITY_999999: 2 },
        PRIORITY_999999: 4,
        'arn:sqns:sqs:testRegion:1:queue2': { PRIORITY_TOTAL: 3, PRIORITY_999999: 2, PRIORITY_1: 1 },
        PRIORITY_1: 1,
      });
    });

    it('should return current event status in prometheus format', async () => {
      const stats = await rp({ uri: `${Env.URL}/api/queues/events/stats?format=prometheus`, json: true });
      const statsWithoutTimeStamp = stats.split('\n').map((each: string) => {
        const words = each.split(' ');
        words.pop();
        return words.join(' ');
      }).join('\n');
      expect(statsWithoutTimeStamp).to.deep.equal('arn_sqns_sqs_testRegion_1_queue1_queue_priority{label="PRIORITY_999999"} 2\n'
        + 'arn_sqns_sqs_testRegion_1_queue1_queue_priority{label="PRIORITY_TOTAL"} 2\n'
        + 'arn_sqns_sqs_testRegion_1_queue2_queue_priority{label="PRIORITY_1"} 1\n'
        + 'arn_sqns_sqs_testRegion_1_queue2_queue_priority{label="PRIORITY_999999"} 2\n'
        + 'arn_sqns_sqs_testRegion_1_queue2_queue_priority{label="PRIORITY_TOTAL"} 3\n'
        + 'queue_priority{label="PRIORITY_1"} 1\n'
        + 'queue_priority{label="PRIORITY_999999"} 4\n'
        + 'queue_priority{label="PRIORITY_TOTAL"} 5\n');
    });

    it('should preserve all priority with zero', async () => {
      await rp({ uri: `${Env.URL}/api/queues/events/stats?format=prometheus`, json: true });
      await client.receiveMessage({ QueueUrl: queue1.QueueUrl, MaxNumberOfMessages: 10 });
      await client.receiveMessage({ QueueUrl: queue2.QueueUrl, MaxNumberOfMessages: 10 });
      const stats = await rp({ uri: `${Env.URL}/api/queues/events/stats?format=prometheus`, json: true });
      const statsWithoutTimeStamp = stats.split('\n').map((each: string) => {
        const words = each.split(' ');
        words.pop();
        return words.join(' ');
      }).join('\n');
      expect(statsWithoutTimeStamp).to.deep.equal('arn_sqns_sqs_testRegion_1_queue1_queue_priority{label="PRIORITY_999999"} 0\n'
        + 'arn_sqns_sqs_testRegion_1_queue1_queue_priority{label="PRIORITY_TOTAL"} 0\n'
        + 'arn_sqns_sqs_testRegion_1_queue2_queue_priority{label="PRIORITY_1"} 0\n'
        + 'arn_sqns_sqs_testRegion_1_queue2_queue_priority{label="PRIORITY_999999"} 0\n'
        + 'arn_sqns_sqs_testRegion_1_queue2_queue_priority{label="PRIORITY_TOTAL"} 0\n'
        + 'queue_priority{label="PRIORITY_1"} 0\n'
        + 'queue_priority{label="PRIORITY_999999"} 0\n'
        + 'queue_priority{label="PRIORITY_TOTAL"} 0\n');
    });
  });

  context('eventPoll', () => {
    let client: SQSClient;
    let queue: SQS.Types.CreateQueueResult;
    beforeEach(async () => {
      await dropDatabase();
      client = new SQSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      queue = await client.createQueue({ QueueName: 'queue2' });
      await client.sendMessageBatch({
        QueueUrl: queue.QueueUrl,
        Entries: [
          { Id: '1234', MessageBody: 'type1' },
          {
            Id: '123',
            MessageBody: 'type2',
            MessageAttributes: { priority: { StringValue: '1', DataType: 'String' } },
          },
          { Id: '1235', MessageBody: 'type1' },
        ],
      });
      await delay();
    });

    it('should return highest priority item', async () => {
      const { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl });
      expect(Messages.length).to.equal(1);
      expect(Messages[0].Body).to.equal('type2');
    });

    it('should return empty error when no event to process.', async () => {
      let { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl });
      expect(Messages.length).to.equal(1);
      ({ Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl }));
      expect(Messages.length).to.equal(1);
      ({ Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl }));
      expect(Messages.length).to.equal(1);
      ({ Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl }));
      expect(Messages.length).to.equal(0);
    });
  });
});
