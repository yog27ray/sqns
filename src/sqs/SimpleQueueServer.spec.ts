import { expect } from 'chai';
import { EventItem } from '../../index';
import { delay, dropDatabase, simpleQueueServer } from '../setup';
import { deleteQueues, Env } from '../test-env';
import { SimpleQueueServerClient } from './aws';
import { CreateQueueResult } from './request-response-types';

describe('MSQueue', () => {
  context('Processing of msQueue with comparator function in descending order', () => {
    let client: SimpleQueueServerClient;
    let queue: CreateQueueResult;
    before(async () => {
      await dropDatabase();
      client = new SimpleQueueServerClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      await deleteQueues(client);
      simpleQueueServer.queueComparator('queue1', (item1: EventItem, item2: EventItem) => (item1.priority > item2.priority));
      queue = await client.createQueue({ QueueName: 'queue1' });
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

    after(() => {
      simpleQueueServer.queueComparator('queue1', undefined);
    });
  });

  context('Processing of msQueue with comparator function in ascending order', () => {
    let client: SimpleQueueServerClient;
    let queue: CreateQueueResult;
    before(async () => {
      await dropDatabase();
      client = new SimpleQueueServerClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      await deleteQueues(client);
      simpleQueueServer.queueComparator('queue1', (item1: EventItem, item2: EventItem) => (item1.priority < item2.priority));
      queue = await client.createQueue({ QueueName: 'queue1' });
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
      simpleQueueServer.queueComparator('queue1', undefined);
    });
  });

  context('Processing of msQueue with comparator function in descending order for fifo', () => {
    let client: SimpleQueueServerClient;
    let queue: CreateQueueResult;
    before(async () => {
      await dropDatabase();
      client = new SimpleQueueServerClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      await deleteQueues(client);
      simpleQueueServer.queueComparator('queue1', (item1: EventItem, item2: EventItem) => (item1.priority > item2.priority));
      queue = await client.createQueue({ QueueName: 'queue1.fifo' });
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
      simpleQueueServer.queueComparator('queue1', undefined);
    });
  });

  context('Processing of msQueue with comparator function in ascending order for fifo', () => {
    let client: SimpleQueueServerClient;
    let queue: CreateQueueResult;
    before(async () => {
      await dropDatabase();
      client = new SimpleQueueServerClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      await deleteQueues(client);
      simpleQueueServer.queueComparator('queue1', (item1: EventItem, item2: EventItem) => (item1.priority < item2.priority));
      queue = await client.createQueue({ QueueName: 'queue1.fifo' });
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
      simpleQueueServer.queueComparator('queue1', undefined);
    });
  });

  context('SendMessage params', () => {
    let client: SimpleQueueServerClient;
    let queue: CreateQueueResult;
    beforeEach(async () => {
      await dropDatabase();
      client = new SimpleQueueServerClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      await deleteQueues(client);
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
    let client: SimpleQueueServerClient;
    let queue: CreateQueueResult;
    beforeEach(async () => {
      await dropDatabase();
      client = new SimpleQueueServerClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      await deleteQueues(client);
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
    let client: SimpleQueueServerClient;
    beforeEach(async () => {
      await dropDatabase();
      client = new SimpleQueueServerClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      await deleteQueues(client);
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
});
