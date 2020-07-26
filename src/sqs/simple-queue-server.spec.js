"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const request_promise_1 = __importDefault(require("request-promise"));
const index_1 = require("../../index");
const setup_1 = require("../setup");
const test_env_1 = require("../test-env");
const aws_1 = require("./aws");
const event_manager_1 = require("./event-manager");
const storage_1 = require("./storage");
describe('SQNS', () => {
    context('Processing of SQNS with comparator function in descending order', () => {
        let client;
        let queue;
        before(async () => {
            await setup_1.dropDatabase();
            client = new aws_1.SimpleQueueServerClient({
                region: test_env_1.Env.region,
                endpoint: `${test_env_1.Env.URL}/api`,
                accessKeyId: test_env_1.Env.accessKeyId,
                secretAccessKey: test_env_1.Env.secretAccessKey,
                maxRetries: 0,
            });
            await test_env_1.deleteQueues(client);
            setup_1.simpleQueueServer.queueComparator('queue1', (item1, item2) => (item1.priority > item2.priority));
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
            await setup_1.delay();
        });
        it('should process event in descending item with descending comparator function', async () => {
            let { Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] });
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(100);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(40);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(30);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(20);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(10);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(1);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(event).to.not.exist;
        });
        after(() => {
            setup_1.simpleQueueServer.queueComparator('queue1', undefined);
        });
    });
    context('Processing of SQNS with comparator function in ascending order', () => {
        let client;
        let queue;
        before(async () => {
            await setup_1.dropDatabase();
            client = new aws_1.SimpleQueueServerClient({
                region: test_env_1.Env.region,
                endpoint: `${test_env_1.Env.URL}/api`,
                accessKeyId: test_env_1.Env.accessKeyId,
                secretAccessKey: test_env_1.Env.secretAccessKey,
                maxRetries: 0,
            });
            await test_env_1.deleteQueues(client);
            setup_1.simpleQueueServer.queueComparator('queue1', (item1, item2) => (item1.priority < item2.priority));
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
            await setup_1.delay();
        });
        it('should process event in ascending item with ascending comparator function', async () => {
            let { Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] });
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(1);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(10);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(20);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(30);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(40);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(100);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(event).to.not.exist;
        });
        after(() => {
            setup_1.simpleQueueServer.queueComparator('queue1', undefined);
        });
    });
    context('Processing of SQNS with comparator function in descending order for fifo', () => {
        let client;
        let queue;
        before(async () => {
            await setup_1.dropDatabase();
            client = new aws_1.SimpleQueueServerClient({
                region: test_env_1.Env.region,
                endpoint: `${test_env_1.Env.URL}/api`,
                accessKeyId: test_env_1.Env.accessKeyId,
                secretAccessKey: test_env_1.Env.secretAccessKey,
                maxRetries: 0,
            });
            await test_env_1.deleteQueues(client);
            setup_1.simpleQueueServer.queueComparator('queue1', (item1, item2) => (item1.priority > item2.priority));
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
            await setup_1.delay();
        });
        it('should process event in descending item with descending comparator function for fifo', async () => {
            let { Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] });
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(1);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(30);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(20);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(40);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(10);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(100);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(event).to.not.exist;
        });
        after(() => {
            setup_1.simpleQueueServer.queueComparator('queue1', undefined);
        });
    });
    context('Processing of SQNS with comparator function in ascending order for fifo', () => {
        let client;
        let queue;
        before(async () => {
            await setup_1.dropDatabase();
            client = new aws_1.SimpleQueueServerClient({
                region: test_env_1.Env.region,
                endpoint: `${test_env_1.Env.URL}/api`,
                accessKeyId: test_env_1.Env.accessKeyId,
                secretAccessKey: test_env_1.Env.secretAccessKey,
                maxRetries: 0,
            });
            await test_env_1.deleteQueues(client);
            setup_1.simpleQueueServer.queueComparator('queue1', (item1, item2) => (item1.priority < item2.priority));
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
            await setup_1.delay();
        });
        it('should process event in descending item with ascending comparator function for fifo', async () => {
            let { Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] });
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(1);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(30);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(20);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(40);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(10);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(100);
            ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
            chai_1.expect(event).to.not.exist;
        });
        after(() => {
            setup_1.simpleQueueServer.queueComparator('queue1', undefined);
        });
    });
    context('SendMessage params', () => {
        let client;
        let queue;
        beforeEach(async () => {
            await setup_1.dropDatabase();
            client = new aws_1.SimpleQueueServerClient({
                region: test_env_1.Env.region,
                endpoint: `${test_env_1.Env.URL}/api`,
                accessKeyId: test_env_1.Env.accessKeyId,
                secretAccessKey: test_env_1.Env.secretAccessKey,
                maxRetries: 0,
            });
            await test_env_1.deleteQueues(client);
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
            chai_1.expect(result.MD5OfMessageBody).to.equal('202cb962ac59075b964b07152d234b70');
            chai_1.expect(result.MD5OfMessageAttributes).to.equal('8bd349963828b39106dd3a35071ccee6');
            chai_1.expect(result.MessageId).to.exist;
            const { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MaxNumberOfMessages: 10 });
            chai_1.expect(Messages.length).to.deep.equal(1);
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
            chai_1.expect(Messages.length).to.deep.equal(1);
            chai_1.expect(Messages[0].Attributes.SenderId).exist;
            chai_1.expect(Messages[0].Attributes.SentTimestamp).exist;
            chai_1.expect(Messages[0].Attributes.SentTimestamp).to.equal(Messages[0].Attributes.ApproximateFirstReceiveTimestamp);
            delete Messages[0].Attributes.SenderId;
            delete Messages[0].Attributes.SentTimestamp;
            delete Messages[0].Attributes.ApproximateFirstReceiveTimestamp;
            chai_1.expect(Messages[0].Attributes).to.deep.equal({ ApproximateReceiveCount: '1', attribute1: 'attributeValue' });
        });
    });
    context('ReceiveMessage params', () => {
        let client;
        let queue;
        beforeEach(async () => {
            await setup_1.dropDatabase();
            client = new aws_1.SimpleQueueServerClient({
                region: test_env_1.Env.region,
                endpoint: `${test_env_1.Env.URL}/api`,
                accessKeyId: test_env_1.Env.accessKeyId,
                secretAccessKey: test_env_1.Env.secretAccessKey,
                maxRetries: 0,
            });
            await test_env_1.deleteQueues(client);
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
            chai_1.expect(Messages.length).to.deep.equal(1);
            chai_1.expect(Messages[0].Attributes.SenderId).not.exist;
            chai_1.expect(Messages[0].Attributes.SentTimestamp).not.exist;
            chai_1.expect(Messages[0].Attributes).to.deep.equal({ ApproximateReceiveCount: '1' });
        });
        it('should receive attribute name "name" only', async () => {
            const { Messages } = await client.receiveMessage({
                QueueUrl: queue.QueueUrl,
                MessageAttributeNames: ['name'],
                MaxNumberOfMessages: 10,
            });
            chai_1.expect(Messages.length).to.deep.equal(1);
            chai_1.expect(Messages[0].MessageAttributes).to.deep.equal({
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
            chai_1.expect(Messages.length).to.deep.equal(1);
        });
        it('should not send same message on next receiveMessage call when VisibilityTimeout is not zero', async () => {
            await client.receiveMessage({ QueueUrl: queue.QueueUrl, VisibilityTimeout: 10 });
            const { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MaxNumberOfMessages: 10 });
            chai_1.expect(Messages.length).to.deep.equal(0);
        });
    });
    context('CreateQueue params', () => {
        let client;
        beforeEach(async () => {
            await setup_1.dropDatabase();
            client = new aws_1.SimpleQueueServerClient({
                region: test_env_1.Env.region,
                endpoint: `${test_env_1.Env.URL}/api`,
                accessKeyId: test_env_1.Env.accessKeyId,
                secretAccessKey: test_env_1.Env.secretAccessKey,
                maxRetries: 0,
            });
            await test_env_1.deleteQueues(client);
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
            chai_1.expect(Messages.length).to.equal(1);
            ({ Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, VisibilityTimeout: 0 }));
            chai_1.expect(Messages.length).to.equal(1);
            ({ Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, VisibilityTimeout: 0 }));
            chai_1.expect(Messages.length).to.equal(0);
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
            chai_1.expect(Messages.length).to.equal(1);
            ({ Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, VisibilityTimeout: 0 }));
            chai_1.expect(Messages.length).to.equal(0);
        });
    });
    context('SQNS current status', () => {
        let eventManager;
        let queue;
        beforeEach(async () => {
            eventManager = new event_manager_1.EventManager();
            eventManager.setStorageEngine(storage_1.Database.IN_MEMORY, {});
            eventManager.initialize(['https://xyz.abc/success', 'https://xyz.abc/failure']);
            queue = await eventManager.createQueue('queue1', {}, {});
            await eventManager.sendMessage('queue1', 'messageBody', {}, {});
            eventManager.resetAll(true);
        });
        it('should return current status in prometheus format', async () => {
            const result = eventManager.prometheus(new Date(1000));
            chai_1.expect(result).to.equal('queue1_queue_priority{label="PRIORITY_999999"} 1 1000\n'
                + 'queue1_queue_priority{label="PRIORITY_TOTAL"} 1 1000\n'
                + 'queue_priority{label="PRIORITY_999999"} 1 1000\n'
                + 'queue_priority{label="PRIORITY_TOTAL"} 1 1000\n');
        });
        it('should delete the queue and reset the status to initial', async () => {
            await eventManager.createQueue('queue2', {}, {});
            await eventManager.sendMessage('queue2', 'messageBody', { priority: { StringValue: '1' } }, {});
            chai_1.expect(eventManager.prometheus(new Date(1000))).to.equal('queue1_queue_priority{label="PRIORITY_999999"} 1 1000\n'
                + 'queue1_queue_priority{label="PRIORITY_TOTAL"} 1 1000\n'
                + 'queue2_queue_priority{label="PRIORITY_1"} 1 1000\n'
                + 'queue2_queue_priority{label="PRIORITY_TOTAL"} 1 1000\n'
                + 'queue_priority{label="PRIORITY_1"} 1 1000\n'
                + 'queue_priority{label="PRIORITY_999999"} 1 1000\n'
                + 'queue_priority{label="PRIORITY_TOTAL"} 2 1000\n');
            await eventManager.deleteQueue('queue2');
            chai_1.expect(eventManager.prometheus(new Date(1000))).to.equal('queue1_queue_priority{label="PRIORITY_999999"} 1 1000\n'
                + 'queue1_queue_priority{label="PRIORITY_TOTAL"} 1 1000\n'
                + 'queue_priority{label="PRIORITY_1"} 0 1000\n'
                + 'queue_priority{label="PRIORITY_999999"} 1 1000\n'
                + 'queue_priority{label="PRIORITY_TOTAL"} 1 1000\n');
            await eventManager.deleteQueue('queue1');
            chai_1.expect(eventManager.prometheus(new Date(1000))).to.equal('queue_priority{label="PRIORITY_TOTAL"} 0 1000\n');
        });
        it('should send request to given url for notify no events to process.', async () => {
            await eventManager.poll(queue, 20);
            const result = await eventManager.poll(queue, 20);
            chai_1.expect(result).to.not.exist;
        });
        it('should not add event in active processing list while adding event.', async () => {
            await eventManager.sendMessage('queue1', 'messageBody1', { priority: { StringValue: '2' } }, {}, '100');
            await eventManager.sendMessage('queue1', 'messageBody2', { priority: { StringValue: '2' } }, {}, '100');
            await eventManager.sendMessage('queue1', 'messageBody3', { priority: { StringValue: '2' } }, {}, '100');
            await eventManager.sendMessage('queue1', 'messageBody4', {}, {}, '100');
            await eventManager.sendMessage('queue1', 'messageBody5', {}, {}, '100');
            chai_1.expect(eventManager.eventStats).to.deep.equal({
                PRIORITY_TOTAL: 1,
                PRIORITY_2: 0,
                queue1: { PRIORITY_TOTAL: 1, PRIORITY_2: 0, PRIORITY_999999: 1 },
                PRIORITY_999999: 1,
            });
        });
    });
    context('Queue processing flow', () => {
        let queueServer;
        let client;
        let queue;
        beforeEach(async () => {
            await setup_1.dropDatabase();
            queueServer = new index_1.SimpleQueueServer({ ...setup_1.queueConfig, cronInterval: '*/2 * * * * *' });
            setup_1.app.use('/api-queue-processing-flow', queueServer.generateRoutes());
            client = new aws_1.SimpleQueueServerClient({
                region: test_env_1.Env.region,
                endpoint: `${test_env_1.Env.URL}/api-queue-processing-flow`,
                accessKeyId: test_env_1.Env.accessKeyId,
                secretAccessKey: test_env_1.Env.secretAccessKey,
                maxRetries: 0,
            });
            await test_env_1.deleteQueues(client);
            queue = await client.createQueue({ QueueName: 'processingFlow' });
            await client.sendMessageBatch({
                QueueUrl: queue.QueueUrl,
                Entries: new Array(100).fill(0)
                    .map((item, index) => ({ Id: `${index}`, MessageBody: `Message ${index}`, DelaySeconds: 2 })),
            });
            await setup_1.delay(5 * 1000);
        });
        it('should add items from storage to queue', async () => {
            const stats = await request_promise_1.default({ uri: `${test_env_1.Env.URL}/api-queue-processing-flow/queues/events/stats`, json: true });
            chai_1.expect(stats).to.deep.equal({
                PRIORITY_TOTAL: 100,
                PRIORITY_999999: 100,
                processingFlow: { PRIORITY_TOTAL: 100, PRIORITY_999999: 100 },
            });
        });
        after(() => {
            queueServer.cancel();
        });
    });
});
//# sourceMappingURL=simple-queue-server.spec.js.map