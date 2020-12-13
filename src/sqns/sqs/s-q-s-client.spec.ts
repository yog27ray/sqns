import { expect } from 'chai';
import rp from 'request-promise';
import { ARN, CreateQueueResult } from '../../../typings';
import { app, delay, dropDatabase, sqns, sqsConfig } from '../../setup';
import { Env } from '../../test-env';
import { Database } from '../common/database';
import { EventItem } from '../common/model/event-item';
import { Queue } from '../common/model/queue';
import { User } from '../common/model/user';
import { SQNS } from '../index';
import { SQSManager } from './manager/s-q-s-manager';
import { SQSClient } from './s-q-s-client';

describe('SQS', () => {
  function getQueueARNFromQueueURL(queueURL: string): ARN {
    const queueURLSplit = queueURL.split('/');
    const queueName = queueURLSplit.pop();
    const companyId = queueURLSplit.pop();
    const region = queueURLSplit.pop();
    return Queue.arn(companyId, region, queueName);
  }

  context('Processing of SQS with comparator function in descending order', () => {
    let client: SQSClient;
    let queue: CreateQueueResult;
    let queueARN: ARN;
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
      queueARN = getQueueARNFromQueueURL(queue.QueueUrl);
      sqns.queueComparator(queueARN, (item1: EventItem, item2: EventItem) => (item1.priority > item2.priority));
      await client.sendMessageBatch({
        QueueUrl: queue.QueueUrl,
        Entries: [
          { Id: '1231', MessageBody: 'type1', MessageAttributes: { priority: { StringValue: '100', DataType: 'String' } } },
          { Id: '1232', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '10', DataType: 'String' } } },
          { Id: '1233', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '40', DataType: 'String' } } },
          { Id: '1234', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '20', DataType: 'String' } } },
          { Id: '1235', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '30', DataType: 'String' } } },
          { Id: '1236', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '1', DataType: 'String' } } },
        ],
      });
      await delay();
    });

    it('should process event in descending item with descending comparator function', async () => {
      let { Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] });
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(100);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(40);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(30);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(20);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(10);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(1);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(event).to.not.exist;
    });

    after(() => sqns.queueComparator(queueARN, undefined));
  });

  context('Processing of SQS with comparator function in ascending order', () => {
    let client: SQSClient;
    let queue: CreateQueueResult;
    let queueARN: ARN;
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
      queueARN = getQueueARNFromQueueURL(queue.QueueUrl);
      sqns.queueComparator(queueARN, (item1: EventItem, item2: EventItem) => (item1.priority < item2.priority));
      await client.sendMessageBatch({
        QueueUrl: queue.QueueUrl,
        Entries: [
          { Id: '1231', MessageBody: 'type1', MessageAttributes: { priority: { StringValue: '100', DataType: 'String' } } },
          { Id: '1232', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '10', DataType: 'String' } } },
          { Id: '1233', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '40', DataType: 'String' } } },
          { Id: '1234', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '20', DataType: 'String' } } },
          { Id: '1235', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '30', DataType: 'String' } } },
          { Id: '1236', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '1', DataType: 'String' } } },
        ],
      });
      await delay();
    });

    it('should process event in ascending item with ascending comparator function', async () => {
      let { Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] });
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(1);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(10);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(20);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(30);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(40);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(100);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(event).to.not.exist;
    });

    after(() => {
      sqns.queueComparator(queueARN, undefined);
    });
  });

  context('Processing of SQS with comparator function in descending order for fifo', () => {
    let client: SQSClient;
    let queueARN: string;
    let queue: CreateQueueResult;
    before(async () => {
      await dropDatabase();
      client = new SQSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      queue = await client.createQueue({ QueueName: 'queue1.fifo' });
      queueARN = getQueueARNFromQueueURL(queue.QueueUrl);
      sqns.queueComparator(queueARN, (item1: EventItem, item2: EventItem) => (item1.priority > item2.priority));
      await client.sendMessageBatch({
        QueueUrl: queue.QueueUrl,
        Entries: [
          { Id: '1231', MessageBody: 'type1', MessageAttributes: { priority: { StringValue: '100', DataType: 'String' } } },
          { Id: '1232', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '10', DataType: 'String' } } },
          { Id: '1233', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '40', DataType: 'String' } } },
          { Id: '1234', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '20', DataType: 'String' } } },
          { Id: '1235', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '30', DataType: 'String' } } },
          { Id: '1236', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '1', DataType: 'String' } } },
        ],
      });
      await delay();
    });

    it('should process event in descending item with descending comparator function for fifo', async () => {
      let { Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] });
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(1);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(30);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(20);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(40);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(10);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(100);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(event).to.not.exist;
    });

    after(() => {
      sqns.queueComparator(queueARN, undefined);
    });
  });

  context('Processing of SQS with comparator function in ascending order for fifo', () => {
    let client: SQSClient;
    let queue: CreateQueueResult;
    let queueARN: ARN;
    before(async () => {
      await dropDatabase();
      client = new SQSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      queue = await client.createQueue({ QueueName: 'queue1.fifo' });
      queueARN = getQueueARNFromQueueURL(queue.QueueUrl);
      sqns.queueComparator(queueARN, (item1: EventItem, item2: EventItem) => (item1.priority < item2.priority));
      await client.sendMessageBatch({
        QueueUrl: queue.QueueUrl,
        Entries: [
          { Id: '1231', MessageBody: 'type1', MessageAttributes: { priority: { StringValue: '100', DataType: 'String' } } },
          { Id: '1232', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '10', DataType: 'String' } } },
          { Id: '1233', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '40', DataType: 'String' } } },
          { Id: '1234', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '20', DataType: 'String' } } },
          { Id: '1235', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '30', DataType: 'String' } } },
          { Id: '1236', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '1', DataType: 'String' } } },
        ],
      });
      await delay();
    });

    it('should process event in descending item with ascending comparator function for fifo', async () => {
      let { Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] });
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(1);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(30);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(20);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(40);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(10);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(100);
      ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
      expect(event).to.not.exist;
    });

    after(() => {
      sqns.queueComparator(queueARN, undefined);
    });
  });

  context('ErrorHandling', () => {
    before(async () => dropDatabase());

    it('should give error while secret key ', async () => {
      try {
        const client = new SQSClient({
          region: Env.region,
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: 'InvalidSecretKey',
          maxRetries: 0,
        });
        await client.createQueue({ QueueName: 'queue1' });
        await Promise.reject({ code: 99, message: 'Should not reach here.' });
      } catch (error) {
        const { code, message } = error;
        expect({ code, message }).deep.equal({
          code: 'SignatureDoesNotMatch',
          message: 'The request signature we calculated does not match the signature you provided.',
        });
      }
    });
  });

  context('SendMessage params', () => {
    let client: SQSClient;
    let queue: CreateQueueResult;
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

    it('should not add two message with same uniqueId in queue1', async () => {
      await client.sendMessage({
        QueueUrl: queue.QueueUrl,
        MessageAttributes: { type: { StringValue: 'type1', DataType: 'String' } },
        MessageDeduplicationId: 'uniqueId1',
        MessageBody: '123',
      });
      const result = await client.sendMessage({
        QueueUrl: queue.QueueUrl,
        MessageAttributes: { type: { StringValue: 'type2', DataType: 'String' } },
        MessageDeduplicationId: 'uniqueId1',
        MessageBody: '123',
      });
      expect(result.MD5OfMessageBody).to.equal('202cb962ac59075b964b07152d234b70');
      expect(result.MD5OfMessageAttributes).to.equal('8bd349963828b39106dd3a35071ccee6');
      expect(result.MessageId).to.exist;
      const { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MaxNumberOfMessages: 10 });
      expect(Messages.length).to.deep.equal(1);
    });

    it('should add system attributes', async () => {
      await client.sendMessage({
        QueueUrl: queue.QueueUrl,
        MessageAttributes: { type: { StringValue: 'type1', DataType: 'String' } },
        MessageSystemAttributes: { attribute1: { StringValue: 'attributeValue', DataType: 'String' } },
        MessageDeduplicationId: 'uniqueId1',
        MessageBody: '123',
      });
      const { Messages } = await client.receiveMessage({
        QueueUrl: queue.QueueUrl,
        AttributeNames: ['ALL'],
        MaxNumberOfMessages: 10,
      });
      expect(Messages.length).to.deep.equal(1);
      expect(Messages[0].Attributes.SenderId).exist;
      expect(Messages[0].Attributes.SentTimestamp).exist;
      expect(Messages[0].Attributes.SentTimestamp).to.equal(Messages[0].Attributes.ApproximateFirstReceiveTimestamp);
      delete Messages[0].Attributes.SenderId;
      delete Messages[0].Attributes.SentTimestamp;
      delete Messages[0].Attributes.ApproximateFirstReceiveTimestamp;
      expect(Messages[0].Attributes).to.deep.equal({ ApproximateReceiveCount: '1', attribute1: 'attributeValue' });
    });
  });

  context('ReceiveMessage params', () => {
    let client: SQSClient;
    let queue: CreateQueueResult;
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
      await client.sendMessage({
        QueueUrl: queue.QueueUrl,
        MessageAttributes: { type: { StringValue: 'type1', DataType: 'String' }, name: { StringValue: 'testUser', DataType: 'String' } },
        MessageSystemAttributes: { attribute1: { StringValue: 'attributeValue', DataType: 'String' } },
        MessageDeduplicationId: 'uniqueId1',
        MessageBody: '123',
      });
    });

    it('should receive system attribute name ApproximateReceiveCount only', async () => {
      const { Messages } = await client.receiveMessage({
        QueueUrl: queue.QueueUrl,
        AttributeNames: ['ApproximateReceiveCount'],
        MaxNumberOfMessages: 10,
      });
      expect(Messages.length).to.deep.equal(1);
      expect(Messages[0].Attributes.SenderId).not.exist;
      expect(Messages[0].Attributes.SentTimestamp).not.exist;
      expect(Messages[0].Attributes).to.deep.equal({ ApproximateReceiveCount: '1' });
    });

    it('should receive attribute name "name" only', async () => {
      const { Messages } = await client.receiveMessage({
        QueueUrl: queue.QueueUrl,
        MessageAttributeNames: ['name'],
        MaxNumberOfMessages: 10,
      });
      expect(Messages.length).to.deep.equal(1);
      expect(Messages[0].MessageAttributes).to.deep.equal({
        name: {
          StringValue: 'testUser',
          StringListValues: [],
          BinaryListValues: [],
          DataType: 'String',
        },
      });
    });

    it('should resend same message on next receiveMessage call when VisibilityTimeout is zero', async () => {
      await client.receiveMessage({ QueueUrl: queue.QueueUrl, VisibilityTimeout: 0 });
      const { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MaxNumberOfMessages: 10 });
      expect(Messages.length).to.deep.equal(1);
    });

    it('should not send same message on next receiveMessage call when VisibilityTimeout is not zero', async () => {
      await client.receiveMessage({ QueueUrl: queue.QueueUrl, VisibilityTimeout: 10 });
      const { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MaxNumberOfMessages: 10 });
      expect(Messages.length).to.deep.equal(0);
    });
  });

  context('CreateQueue params', () => {
    let client: SQSClient;
    beforeEach(async () => {
      await dropDatabase();
      client = new SQSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
    });

    it('should receive message maximum of 2 times', async () => {
      const queue = await client.createQueue({ QueueName: 'queue1', Attributes: { maxReceiveCount: '2' } });
      await client.sendMessage({
        QueueUrl: queue.QueueUrl,
        MessageAttributes: { type: { StringValue: 'type1', DataType: 'String' }, name: { StringValue: 'testUser', DataType: 'String' } },
        MessageSystemAttributes: { attribute1: { StringValue: 'attributeValue', DataType: 'String' } },
        MessageDeduplicationId: 'uniqueId1',
        MessageBody: '123',
      });
      let { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, VisibilityTimeout: 0 });
      expect(Messages.length).to.equal(1);
      ({ Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, VisibilityTimeout: 0 }));
      expect(Messages.length).to.equal(1);
      ({ Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, VisibilityTimeout: 0 }));
      expect(Messages.length).to.equal(0);
    });

    it('should receive message at-least 1 times', async () => {
      const queue = await client.createQueue({ QueueName: 'queue1', Attributes: { maxReceiveCount: '-10' } });
      await client.sendMessage({
        QueueUrl: queue.QueueUrl,
        MessageAttributes: { type: { StringValue: 'type1', DataType: 'String' }, name: { StringValue: 'testUser', DataType: 'String' } },
        MessageSystemAttributes: { attribute1: { StringValue: 'attributeValue', DataType: 'String' } },
        MessageDeduplicationId: 'uniqueId1',
        MessageBody: '123',
      });
      let { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, VisibilityTimeout: 0 });
      expect(Messages.length).to.equal(1);
      ({ Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, VisibilityTimeout: 0 }));
      expect(Messages.length).to.equal(0);
    });
  });

  context('SQNS current status', () => {
    let eventManager: SQSManager;
    let queue: Queue;
    let user: User;

    beforeEach(async () => {
      user = new User({ id: '1234', organizationId: '1' });
      eventManager = new SQSManager(
        { ...sqsConfig, requestTasks: ['https://xyz.abc/success', 'https://xyz.abc/failure'] },
        [],
        Database.MONGO_DB);
      queue = await eventManager.createQueue(user, 'queue1', Env.region, {}, {});
      await eventManager.sendMessage(queue, 'messageBody', {}, {});
      eventManager.resetAll(true);
    });

    it('should return current status in prometheus format', async () => {
      const result = eventManager.prometheus(new Date(1000));
      expect(result).to.equal('arn_sqns_sqs_testRegion_1_queue1_queue_priority{label="PRIORITY_999999"} 1 1000\n'
        + 'arn_sqns_sqs_testRegion_1_queue1_queue_priority{label="PRIORITY_TOTAL"} 1 1000\n'
        + 'queue_priority{label="PRIORITY_999999"} 1 1000\n'
        + 'queue_priority{label="PRIORITY_TOTAL"} 1 1000\n');
    });

    it('should delete the queue and reset the status to initial', async () => {
      const queue2 = await eventManager.createQueue(user, 'queue2', Env.region, {}, {});
      await eventManager.sendMessage(queue2, 'messageBody', { priority: { StringValue: '1', DataType: 'String' } }, {});
      expect(eventManager.prometheus(new Date(1000))).to
        .equal('arn_sqns_sqs_testRegion_1_queue1_queue_priority{label="PRIORITY_999999"} 1 1000\n'
        + 'arn_sqns_sqs_testRegion_1_queue1_queue_priority{label="PRIORITY_TOTAL"} 1 1000\n'
        + 'arn_sqns_sqs_testRegion_1_queue2_queue_priority{label="PRIORITY_1"} 1 1000\n'
        + 'arn_sqns_sqs_testRegion_1_queue2_queue_priority{label="PRIORITY_TOTAL"} 1 1000\n'
        + 'queue_priority{label="PRIORITY_1"} 1 1000\n'
        + 'queue_priority{label="PRIORITY_999999"} 1 1000\n'
        + 'queue_priority{label="PRIORITY_TOTAL"} 2 1000\n');
      await eventManager.deleteQueue(queue2);
      expect(eventManager.prometheus(new Date(1000))).to
        .equal('arn_sqns_sqs_testRegion_1_queue1_queue_priority{label="PRIORITY_999999"} 1 1000\n'
        + 'arn_sqns_sqs_testRegion_1_queue1_queue_priority{label="PRIORITY_TOTAL"} 1 1000\n'
        + 'queue_priority{label="PRIORITY_1"} 0 1000\n'
        + 'queue_priority{label="PRIORITY_999999"} 1 1000\n'
        + 'queue_priority{label="PRIORITY_TOTAL"} 1 1000\n');
      await eventManager.deleteQueue(queue);
      expect(eventManager.prometheus(new Date(1000))).to.equal('queue_priority{label="PRIORITY_TOTAL"} 0 1000\n');
    });

    it('should send request to given url for notify no events to process.', async () => {
      await eventManager.poll(queue, 20);
      const result = await eventManager.poll(queue, 20);
      expect(result).to.not.exist;
    });

    it('should not add event in active processing list while adding event.', async () => {
      await eventManager.sendMessage(queue, 'messageBody1', { priority: { StringValue: '2', DataType: 'String' } }, {}, '100');
      await eventManager.sendMessage(queue, 'messageBody2', { priority: { StringValue: '2', DataType: 'String' } }, {}, '100');
      await eventManager.sendMessage(queue, 'messageBody3', { priority: { StringValue: '2', DataType: 'String' } }, {}, '100');
      await eventManager.sendMessage(queue, 'messageBody4', {}, {}, '100');
      await eventManager.sendMessage(queue, 'messageBody5', {}, {}, '100');
      expect(eventManager.eventStats).to.deep.equal({
        PRIORITY_TOTAL: 1,
        PRIORITY_2: 0,
        'arn:sqns:sqs:testRegion:1:queue1': { PRIORITY_TOTAL: 1, PRIORITY_2: 0, PRIORITY_999999: 1 },
        PRIORITY_999999: 1,
      });
    });
  });

  context('Queue processing flow', () => {
    let queueServer: SQNS;
    let client: SQSClient;
    let queue: CreateQueueResult;

    beforeEach(async () => {
      await dropDatabase();
      queueServer = new SQNS({
        region: Env.region,
        adminSecretKeys: [{ accessKey: Env.accessKeyId, secretAccessKey: Env.secretAccessKey }],
        sqs: { ...sqsConfig, cronInterval: '*/2 * * * * *' },
      });
      queueServer.generateExpressRoutes(`http://127.0.0.1:${Env.PORT}`, '/api-queue-processing-flow', app);
      client = new SQSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api-queue-processing-flow`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      queue = await client.createQueue({ QueueName: 'processingFlow' });
      await client.sendMessageBatch({
        QueueUrl: queue.QueueUrl,
        Entries: new Array(100).fill(0)
          .map((item: number, index: number) => ({ Id: `${index}`, MessageBody: `Message ${index}`, DelaySeconds: 2 })),
      });
      await delay(5 * 1000);
    });

    it('should add items from storage to queue', async () => {
      const stats = await rp({ uri: `${Env.URL}/api-queue-processing-flow/queues/events/stats`, json: true });
      expect(stats).to.deep.equal({
        PRIORITY_TOTAL: 100,
        PRIORITY_999999: 100,
        'arn:sqns:sqs:testRegion:1:processingFlow': { PRIORITY_TOTAL: 100, PRIORITY_999999: 100 },
      });
    });

    after(() => queueServer.cancel());
  });
});
