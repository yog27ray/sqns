"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sqs_1 = __importDefault(require("aws-sdk/clients/sqs"));
const chai_1 = require("chai");
const request_promise_1 = __importDefault(require("request-promise"));
const setup_1 = require("../../../setup");
const test_env_1 = require("../../../test-env");
const aws_1 = require("../../aws");
describe('EventManagerMasterSpec', () => {
    context('errorHandling', () => {
        let client;
        before(async () => {
            await setup_1.dropDatabase();
            client = new aws_1.SimpleQueueServerClient({});
            client = new aws_1.SimpleQueueServerClient({
                region: test_env_1.Env.region,
                endpoint: `${test_env_1.Env.URL}/api`,
                accessKeyId: 'invalidKey',
                secretAccessKey: 'invalidAccessKey',
                maxRetries: 0,
            });
        });
        it('should give error when client credentials are wrong.', async () => {
            try {
                await client.createQueue({ QueueName: 'queue1' });
                await Promise.reject({ code: 99, message: 'should not reach here.' });
            }
            catch (error) {
                const { code, message } = error;
                chai_1.expect({ code, message }).to.deep.equal({
                    code: 'SignatureDoesNotMatch',
                    message: 'The request signature we calculated does not match the signature you provided.',
                });
            }
        });
        it('should give error when client credentials are wrong for listQueues.', async () => {
            try {
                await client.listQueues({});
                await Promise.reject({ code: 99, message: 'should not reach here.' });
            }
            catch (error) {
                const { code, message } = error;
                chai_1.expect({ code, message }).to.deep.equal({
                    code: 'SignatureDoesNotMatch',
                    message: 'The request signature we calculated does not match the signature you provided.',
                });
            }
        });
        it('should give error function is not supported.', async () => {
            try {
                const sqs = new sqs_1.default({
                    region: test_env_1.Env.region,
                    endpoint: `${test_env_1.Env.URL}/api/sqs`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                    maxRetries: 0,
                });
                await new Promise((resolve, reject) => {
                    sqs.addPermission({
                        QueueUrl: `${test_env_1.Env.URL}/api/sqs/queue/queue1`,
                        Label: 'label',
                        AWSAccountIds: ['accountIds'],
                        Actions: ['testAction'],
                    }, (error) => {
                        if (error) {
                            reject(error);
                            return;
                        }
                        resolve();
                    });
                });
                await Promise.reject({ code: 99, message: 'should not reach here.' });
            }
            catch (error) {
                const { code, message } = error;
                chai_1.expect({ code, message }).to.deep.equal({
                    code: 'Unhandled function',
                    message: 'This function is not supported.',
                });
            }
        });
    });
    context('createQueue', () => {
        let client;
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
        });
        it('should create queue1', async () => {
            const result = await client.createQueue({
                QueueName: 'queue1',
                Attributes: { attribute: 'attribute1' },
                tags: { tag: 'tag1' },
            });
            chai_1.expect(result.QueueUrl).to.equal(`${test_env_1.Env.URL}/api/sqs/queue/queue1`);
        });
        it('should allow request create same queue multiple times', async () => {
            await client.createQueue({ QueueName: 'queue1' });
            const result = await client.createQueue({ QueueName: 'queue1' });
            chai_1.expect(result.QueueUrl).to.equal(`${test_env_1.Env.URL}/api/sqs/queue/queue1`);
        });
    });
    context('getQueueUrl', () => {
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
            queue = await client.createQueue({ QueueName: 'queue1' });
        });
        it('should give error when queue doesn\'t exists.', async () => {
            try {
                await client.getQueueUrl({ QueueName: 'queue11' });
                await Promise.reject({ code: 99, message: 'should not reach here.' });
            }
            catch (error) {
                chai_1.expect(error.code).to.equal('NonExistentQueue');
                chai_1.expect(error.message).to.equal('The specified "queue11" queue does not exist.');
            }
        });
        it('should return queue1 url', async () => {
            const result = await client.getQueueUrl({ QueueName: 'queue1' });
            chai_1.expect(result.QueueUrl).to.equal(`${test_env_1.Env.URL}/api/sqs/queue/queue1`);
        });
    });
    context('deleteQueue', () => {
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
            queue = await client.createQueue({ QueueName: 'queue1' });
        });
        it('should give error when queue doesn\'t exists.', async () => {
            try {
                await client.deleteQueue({ QueueUrl: `${test_env_1.Env.URL}/api/sqs/queue11` });
                await Promise.reject({ code: 99, message: 'should not reach here.' });
            }
            catch (error) {
                chai_1.expect(error.code).to.equal('NonExistentQueue');
                chai_1.expect(error.message).to.equal('The specified "queue11" queue does not exist.');
            }
        });
        it('should delete queue queue1', async () => {
            try {
                await client.deleteQueue({ QueueUrl: queue.QueueUrl });
                await client.getQueueUrl({ QueueName: 'queue1' });
                await Promise.reject({ code: 99, message: 'should not reach here.' });
            }
            catch (error) {
                chai_1.expect(error.code).to.equal('NonExistentQueue');
                chai_1.expect(error.message).to.equal('The specified "queue1" queue does not exist.');
            }
        });
        it('should delete fifo queue queue1.fifo', async () => {
            try {
                queue = await client.createQueue({ QueueName: 'queue1.fifo' });
                await client.deleteQueue({ QueueUrl: queue.QueueUrl });
                await client.getQueueUrl({ QueueName: 'queue1.fifo' });
                await Promise.reject({ code: 99, message: 'should not reach here.' });
            }
            catch (error) {
                chai_1.expect(error.code).to.equal('NonExistentQueue');
                chai_1.expect(error.message).to.equal('The specified "queue1.fifo" queue does not exist.');
            }
        });
    });
    context('listQueues', () => {
        let client;
        before(async () => {
            await setup_1.dropDatabase();
            client = new aws_1.SimpleQueueServerClient({
                region: test_env_1.Env.region,
                endpoint: `${test_env_1.Env.URL}/api`,
                accessKeyId: test_env_1.Env.accessKeyId,
                secretAccessKey: test_env_1.Env.secretAccessKey,
                maxRetries: 0,
            });
            await client.createQueue({ QueueName: '1queue1' });
            await client.createQueue({ QueueName: '1queue2' });
            await client.createQueue({ QueueName: '2queue3' });
        });
        it('should return list of all queues', async () => {
            const list = await client.listQueues();
            chai_1.expect(list.QueueUrls).to.deep.equal([
                `${test_env_1.Env.URL}/api/sqs/queue/1queue1`,
                `${test_env_1.Env.URL}/api/sqs/queue/1queue2`,
                `${test_env_1.Env.URL}/api/sqs/queue/2queue3`,
            ]);
        });
        it('should return list of all queues starting with "1q"', async () => {
            const list = await client.listQueues({ QueueNamePrefix: '1q' });
            chai_1.expect(list.QueueUrls).to.deep.equal([
                `${test_env_1.Env.URL}/api/sqs/queue/1queue1`,
                `${test_env_1.Env.URL}/api/sqs/queue/1queue2`,
            ]);
        });
    });
    context('SendMessage', () => {
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
        it('should give error when queue doesn\'t exists.', async () => {
            try {
                await client.sendMessage({ QueueUrl: `${queue.QueueUrl}1`, MessageBody: '123' });
                await Promise.reject({ code: 99, message: 'should not reach here.' });
            }
            catch (error) {
                chai_1.expect(error.code).to.equal('NonExistentQueue');
                chai_1.expect(error.message).to.equal('The specified "queue11" queue does not exist.');
            }
        });
        it('should add new event in the queue1', async () => {
            const result = await client.sendMessage({
                QueueUrl: queue.QueueUrl,
                MessageAttributes: { type: { StringValue: 'type1', DataType: 'String' } },
                MessageDeduplicationId: 'uniqueId1',
                MessageBody: '123',
            });
            chai_1.expect(result.MD5OfMessageBody).to.equal('202cb962ac59075b964b07152d234b70');
            chai_1.expect(result.MD5OfMessageAttributes).to.equal('8bd349963828b39106dd3a35071ccee6');
            chai_1.expect(result.MessageId).to.exist;
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
            chai_1.expect(firstMessageId).to.equal(result.MessageId);
            const messages = await client.receiveMessage({
                QueueUrl: queue.QueueUrl,
                MaxNumberOfMessages: 10,
                MessageAttributeNames: ['ALL'],
            });
            chai_1.expect(messages.Messages.length).to.equal(1);
            chai_1.expect(messages.Messages[0].MessageId).to.equal('uniqueId1');
            chai_1.expect(messages.Messages[0].ReceiptHandle).to.exist;
            test_env_1.deleteDynamicDataOfResults(messages);
            chai_1.expect(messages).to.deep.equal({
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
            queue = await client.createQueue({ QueueName: 'queue1' });
        });
        it('should give error when queue doesn\'t exists.', async () => {
            try {
                await client.sendMessageBatch({
                    QueueUrl: `${queue.QueueUrl}1`,
                    Entries: [{ Id: '123', MessageBody: '123' }, { Id: '1234', MessageBody: '1234' }],
                });
                await Promise.reject({ code: 99, message: 'should not reach here.' });
            }
            catch (error) {
                chai_1.expect(error.code).to.equal('NonExistentQueue');
                chai_1.expect(error.message).to.equal('The specified "queue11" queue does not exist.');
            }
        });
        it('should add new events in the queue1', async () => {
            const results = await client.sendMessageBatch({
                QueueUrl: queue.QueueUrl,
                Entries: [{ Id: '123', MessageBody: '123' }, { Id: '1234', MessageBody: '1234' }],
            });
            chai_1.expect(results.Successful.length).to.equal(2);
            chai_1.expect(results.Successful[0].Id).to.equal('123');
            chai_1.expect(results.Successful[0].MD5OfMessageBody).to.equal('202cb962ac59075b964b07152d234b70');
            chai_1.expect(results.Successful[0].MD5OfMessageAttributes).to.equal('d41d8cd98f00b204e9800998ecf8427e');
            chai_1.expect(results.Successful[0].MessageId).to.exist;
            chai_1.expect(results.Successful[1].Id).to.equal('1234');
            chai_1.expect(results.Successful[1].MD5OfMessageBody).to.equal('81dc9bdb52d04dc20036dbd8313ed055');
            chai_1.expect(results.Successful[1].MD5OfMessageAttributes).to.equal('d41d8cd98f00b204e9800998ecf8427e');
            chai_1.expect(results.Successful[1].MessageId).to.exist;
            chai_1.expect(results.Failed.length).to.equal(0);
        });
    });
    context('receiveMessage', () => {
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
            queue = await client.createQueue({ QueueName: 'queue1' });
            await client.sendMessageBatch({
                QueueUrl: queue.QueueUrl,
                Entries: [
                    { Id: '123', MessageBody: '123' },
                    { Id: '1234', MessageBody: '1234' },
                    { Id: '1235', MessageBody: '1235' },
                ],
            });
            await setup_1.delay();
        });
        it('should give error when queue doesn\'t exists.', async () => {
            try {
                await client.receiveMessage({ QueueUrl: `${queue.QueueUrl}1` });
                await Promise.reject({ code: 99, message: 'should not reach here.' });
            }
            catch (error) {
                chai_1.expect(error.code).to.equal('NonExistentQueue');
                chai_1.expect(error.message).to.equal('The specified "queue11" queue does not exist.');
            }
        });
        it('should find one event in the queue1', async () => {
            const { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl });
            chai_1.expect(Messages.length).to.equal(1);
            chai_1.expect(Messages[0].MessageId).to.exist;
            chai_1.expect(Messages[0].ReceiptHandle).to.exist;
            chai_1.expect(Messages[0].Body).to.exist;
            chai_1.expect(Messages[0].MD5OfBody).to.exist;
        });
        it('should find two event in the queue1', async () => {
            const { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MaxNumberOfMessages: 2 });
            chai_1.expect(Messages.length).to.equal(2);
            chai_1.expect(Messages[0].MessageId).to.exist;
            chai_1.expect(Messages[0].ReceiptHandle).to.exist;
            chai_1.expect(Messages[0].Body).to.exist;
            chai_1.expect(Messages[0].MD5OfBody).to.exist;
            chai_1.expect(Messages[1].MessageId).to.exist;
            chai_1.expect(Messages[1].ReceiptHandle).to.exist;
            chai_1.expect(Messages[1].Body).to.exist;
            chai_1.expect(Messages[1].MD5OfBody).to.exist;
        });
        it('should find no event in the queue2', async () => {
            const queue2 = await client.createQueue({ QueueName: 'queue2' });
            const { Messages } = await client.receiveMessage({ QueueUrl: queue2.QueueUrl });
            chai_1.expect(Messages.length).to.equal(0);
        });
    });
    context('eventStats', () => {
        let client;
        let queue1;
        let queue2;
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
            await setup_1.delay();
        });
        it('should return current event status', async () => {
            const stats = await request_promise_1.default({ uri: `${test_env_1.Env.URL}/api/queues/events/stats`, json: true });
            chai_1.expect(stats).to.deep.equal({
                PRIORITY_TOTAL: 5,
                queue1: { PRIORITY_TOTAL: 2, PRIORITY_999999: 2 },
                PRIORITY_999999: 4,
                queue2: { PRIORITY_TOTAL: 3, PRIORITY_999999: 2, PRIORITY_1: 1 },
                PRIORITY_1: 1,
            });
        });
        it('should return current event status in prometheus format', async () => {
            const stats = await request_promise_1.default({ uri: `${test_env_1.Env.URL}/api/queues/events/stats?format=prometheus`, json: true });
            const statsWithoutTimeStamp = stats.split('\n').map((each) => {
                const words = each.split(' ');
                words.pop();
                return words.join(' ');
            }).join('\n');
            chai_1.expect(statsWithoutTimeStamp).to.deep.equal('queue1_queue_priority{label="PRIORITY_999999"} 2\n'
                + 'queue1_queue_priority{label="PRIORITY_TOTAL"} 2\n'
                + 'queue2_queue_priority{label="PRIORITY_1"} 1\n'
                + 'queue2_queue_priority{label="PRIORITY_999999"} 2\n'
                + 'queue2_queue_priority{label="PRIORITY_TOTAL"} 3\n'
                + 'queue_priority{label="PRIORITY_1"} 1\n'
                + 'queue_priority{label="PRIORITY_999999"} 4\n'
                + 'queue_priority{label="PRIORITY_TOTAL"} 5\n');
        });
        it('should preserve all priority with zero', async () => {
            await request_promise_1.default({ uri: `${test_env_1.Env.URL}/api/queues/events/stats?format=prometheus`, json: true });
            await client.receiveMessage({ QueueUrl: queue1.QueueUrl, MaxNumberOfMessages: 10 });
            await client.receiveMessage({ QueueUrl: queue2.QueueUrl, MaxNumberOfMessages: 10 });
            const stats = await request_promise_1.default({ uri: `${test_env_1.Env.URL}/api/queues/events/stats?format=prometheus`, json: true });
            const statsWithoutTimeStamp = stats.split('\n').map((each) => {
                const words = each.split(' ');
                words.pop();
                return words.join(' ');
            }).join('\n');
            chai_1.expect(statsWithoutTimeStamp).to.deep.equal('queue1_queue_priority{label="PRIORITY_999999"} 0\n'
                + 'queue1_queue_priority{label="PRIORITY_TOTAL"} 0\n'
                + 'queue2_queue_priority{label="PRIORITY_1"} 0\n'
                + 'queue2_queue_priority{label="PRIORITY_999999"} 0\n'
                + 'queue2_queue_priority{label="PRIORITY_TOTAL"} 0\n'
                + 'queue_priority{label="PRIORITY_1"} 0\n'
                + 'queue_priority{label="PRIORITY_999999"} 0\n'
                + 'queue_priority{label="PRIORITY_TOTAL"} 0\n');
        });
    });
    context('eventPoll', () => {
        let client;
        let queue;
        beforeEach(async () => {
            await setup_1.dropDatabase();
            setup_1.simpleQueueServer.resetAll();
            client = new aws_1.SimpleQueueServerClient({
                region: test_env_1.Env.region,
                endpoint: `${test_env_1.Env.URL}/api`,
                accessKeyId: test_env_1.Env.accessKeyId,
                secretAccessKey: test_env_1.Env.secretAccessKey,
                maxRetries: 0,
            });
            await test_env_1.deleteQueues(client);
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
            await setup_1.delay();
        });
        it('should return highest priority item', async () => {
            const { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl });
            chai_1.expect(Messages.length).to.equal(1);
            chai_1.expect(Messages[0].Body).to.equal('type2');
        });
        it('should return empty error when no event to process.', async () => {
            let { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl });
            chai_1.expect(Messages.length).to.equal(1);
            ({ Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl }));
            chai_1.expect(Messages.length).to.equal(1);
            ({ Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl }));
            chai_1.expect(Messages.length).to.equal(1);
            ({ Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl }));
            chai_1.expect(Messages.length).to.equal(0);
        });
    });
});
//# sourceMappingURL=event-manager-master.spec.js.map