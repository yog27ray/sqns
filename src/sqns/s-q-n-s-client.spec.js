"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const moment_1 = __importDefault(require("moment"));
const nock_1 = __importDefault(require("nock"));
const xml2js_1 = require("xml2js");
const setup_1 = require("../setup");
const test_env_1 = require("../test-env");
const authentication_1 = require("./common/auth/authentication");
const s_q_n_s_error_1 = require("./common/auth/s-q-n-s-error");
const base_client_1 = require("./common/client/base-client");
const common_1 = require("./common/helper/common");
const delivery_policy_helper_1 = require("./common/helper/delivery-policy-helper");
const base_storage_engine_1 = require("./common/model/base-storage-engine");
const event_item_1 = require("./common/model/event-item");
const queue_1 = require("./common/model/queue");
const user_1 = require("./common/model/user");
const request_client_1 = require("./common/request-client/request-client");
const s_q_n_s_1 = require("./s-q-n-s");
const s_q_n_s_client_1 = require("./s-q-n-s-client");
const s_q_s_manager_1 = require("./sqs/manager/s-q-s-manager");
describe('SQNSClient', () => {
    describe('SQS', () => {
        context('CreateQueue', () => {
            let client;
            beforeEach(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
            });
            it('should create queue1', async () => {
                const result = await client.createQueue({
                    QueueName: 'queue1',
                    Attributes: { attribute: 'attribute1' },
                    tags: { tag: 'tag1' },
                });
                chai_1.expect(result.QueueUrl).to.equal(`${test_env_1.Env.URL}/api/sqs/sqns/1/queue1`);
            });
            it('should allow request create same queue multiple times', async () => {
                await client.createQueue({ QueueName: 'queue1' });
                const result = await client.createQueue({ QueueName: 'queue1' });
                chai_1.expect(result.QueueUrl).to.equal(`${test_env_1.Env.URL}/api/sqs/sqns/1/queue1`);
            });
            it('should receive message maximum of 2 times', async () => {
                const deliveryPolicy = JSON.parse(JSON.stringify(delivery_policy_helper_1.DeliveryPolicyHelper
                    .DEFAULT_DELIVERY_POLICY.default.defaultHealthyRetryPolicy));
                deliveryPolicy.maxDelayTarget = 0;
                deliveryPolicy.minDelayTarget = 0;
                const queue = await client.createQueue({
                    QueueName: 'queue1',
                    Attributes: { maxReceiveCount: '2', DeliveryPolicy: JSON.stringify(deliveryPolicy) },
                });
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
        context('SendMessage', () => {
            let client;
            let queue;
            beforeEach(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                queue = await client.createQueue({ QueueName: 'queue1' });
            });
            it('should not add two message with same uniqueId in queue1', async () => {
                const result1 = await client.sendMessage({
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
                chai_1.expect(result.MD5OfMessageBody).to.equal(result1.MD5OfMessageBody);
                chai_1.expect(result.MD5OfMessageAttributes).to.equal(result1.MD5OfMessageAttributes);
                chai_1.expect(result.MessageId).to.equal(result1.MessageId);
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
            it('should add new event in the queue1 with special characters in MessageAttributes', async () => {
                const result = await client.sendMessage({
                    QueueUrl: queue.QueueUrl,
                    MessageAttributes: {
                        type: { StringValue: 'type1', DataType: 'String' },
                        message: {
                            DataType: 'String',
                            StringValue: 'Hello User, Hope you would have started using the product & comfortable with it.'
                                + ' Do let us know if there\'s anything I can do for you by responding to this msg. We will always be there to support'
                                + ' you through this process.',
                        },
                    },
                    MessageDeduplicationId: 'uniqueId1',
                    MessageBody: '123',
                });
                chai_1.expect(result.MD5OfMessageBody).to.equal('202cb962ac59075b964b07152d234b70');
                chai_1.expect(result.MD5OfMessageAttributes).to.equal('2951094a8d0f32172b42c6e00d63a24e');
                chai_1.expect(result.MessageId).to.exist;
            });
        });
        context('FindMessageById', () => {
            let client;
            let queue;
            let queue2;
            let messages;
            beforeEach(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                queue = await client.createQueue({ QueueName: 'queue1' });
                queue2 = await client.createQueue({ QueueName: 'queue2' });
                ({ Successful: messages } = await client.sendMessageBatch({
                    QueueUrl: queue.QueueUrl,
                    Entries: [
                        {
                            Id: '123',
                            MessageBody: '123',
                            MessageAttributes: {
                                type: { StringValue: 'type1', DataType: 'String' },
                                name: { StringValue: 'testUser', DataType: 'String' },
                            },
                            MessageSystemAttributes: { attribute1: { StringValue: 'attributeValue', DataType: 'String' } },
                            MessageDeduplicationId: 'uniqueId1',
                        },
                        { Id: '1234', MessageBody: '1234', MessageAttributes: { type: { StringValue: 'type2', DataType: 'String' } } },
                        { Id: '1235', MessageBody: '1235' },
                    ],
                }));
            });
            it('should find message when messageId is correct.', async () => {
                const { Message } = await client.findByMessageId({
                    MessageId: messages[1].MessageId,
                    QueueUrl: queue.QueueUrl,
                });
                chai_1.expect(Message.MessageId).to.equal(messages[1].MessageId);
                chai_1.expect(Message.Body).to.equal('1234');
                chai_1.expect(Message.Attributes).to.exist;
                chai_1.expect(Message.MessageAttributes).to.exist;
                chai_1.expect(Message.State).to.equal(event_item_1.EventState.PENDING);
            });
            it('should not find message when messageId correct and queueUrl is different.', async () => {
                const { Message } = await client.findByMessageId({
                    MessageId: messages[1].MessageId,
                    QueueUrl: queue2.QueueUrl,
                });
                chai_1.expect(Message).to.not.exist;
            });
            it('should not find message when messageId is invalid.', async () => {
                const { Message } = await client.findByMessageId({
                    MessageId: 'invalidMessageId',
                    QueueUrl: queue.QueueUrl,
                });
                chai_1.expect(Message).to.not.exist;
            });
        });
        context('UpdateMessageById', () => {
            let client;
            let queue;
            let queue2;
            let messages;
            beforeEach(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                queue = await client.createQueue({ QueueName: 'queue1' });
                queue2 = await client.createQueue({ QueueName: 'queue2' });
                ({ Successful: messages } = await client.sendMessageBatch({
                    QueueUrl: queue.QueueUrl,
                    Entries: [{
                            Id: '123',
                            MessageBody: '123',
                            MessageAttributes: {
                                type: { StringValue: 'type1', DataType: 'String' },
                                name: { StringValue: 'testUser', DataType: 'String' },
                            },
                            MessageSystemAttributes: { attribute1: { StringValue: 'attributeValue', DataType: 'String' } },
                            MessageDeduplicationId: 'uniqueId1',
                        }],
                }));
            });
            it('should update message with time and state.', async () => {
                const { Message: OriginalMessage } = await client.findByMessageId({
                    MessageId: messages[0].MessageId,
                    QueueUrl: queue.QueueUrl,
                });
                const { Message: UpdatedMessage } = await client.updateMessageById({
                    MessageId: messages[0].MessageId,
                    QueueUrl: queue.QueueUrl,
                    DelaySeconds: 100,
                    State: event_item_1.EventState.SUCCESS,
                });
                const { Message } = await client.findByMessageId({
                    MessageId: messages[0].MessageId,
                    QueueUrl: queue.QueueUrl,
                });
                chai_1.expect(Message.MessageId).to.equal(OriginalMessage.MessageId);
                chai_1.expect(Message.Body).to.equal(OriginalMessage.Body);
                chai_1.expect(Message.State).to.equal('SUCCESS');
                chai_1.expect(Message.MessageAttributes).to.exist;
                chai_1.expect(Message.Attributes).to.exist;
                chai_1.expect(UpdatedMessage.MessageAttributes).to.exist;
                chai_1.expect(UpdatedMessage.Attributes).to.exist;
                chai_1.expect(new Date(Message.EventTime).getTime() - new Date(OriginalMessage.EventTime).getTime()).to.be.least(100000);
                chai_1.expect(new Date(Message.EventTime).getTime() - new Date(OriginalMessage.EventTime).getTime()).to.be.most(101000);
            });
            it('should update message with different state.', async () => {
                await client.updateMessageById({
                    MessageId: messages[0].MessageId,
                    QueueUrl: queue.QueueUrl,
                    State: event_item_1.EventState.SUCCESS,
                });
                let { Message } = await client.findByMessageId({
                    MessageId: messages[0].MessageId,
                    QueueUrl: queue.QueueUrl,
                });
                chai_1.expect(Message.State).to.equal('SUCCESS');
                await client.updateMessageById({
                    MessageId: messages[0].MessageId,
                    QueueUrl: queue.QueueUrl,
                    State: event_item_1.EventState.FAILURE,
                });
                ({ Message } = await client.findByMessageId({
                    MessageId: messages[0].MessageId,
                    QueueUrl: queue.QueueUrl,
                }));
                chai_1.expect(Message.State).to.equal('FAILURE');
                await client.updateMessageById({
                    MessageId: messages[0].MessageId,
                    QueueUrl: queue.QueueUrl,
                    State: event_item_1.EventState.PENDING,
                });
                ({ Message } = await client.findByMessageId({
                    MessageId: messages[0].MessageId,
                    QueueUrl: queue.QueueUrl,
                }));
                chai_1.expect(Message.State).to.equal('PENDING');
                await client.updateMessageById({
                    MessageId: messages[0].MessageId,
                    QueueUrl: queue.QueueUrl,
                    State: event_item_1.EventState.PROCESSING,
                });
                ({ Message } = await client.findByMessageId({
                    MessageId: messages[0].MessageId,
                    QueueUrl: queue.QueueUrl,
                }));
                chai_1.expect(Message.State).to.equal('PROCESSING');
            });
        });
        context('ReceiveMessage', () => {
            let client;
            let queue;
            beforeEach(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                queue = await client.createQueue({ QueueName: 'queue1' });
                await client.sendMessageBatch({
                    QueueUrl: queue.QueueUrl,
                    Entries: [
                        {
                            Id: '123',
                            MessageBody: '123',
                            MessageAttributes: {
                                type: { StringValue: 'type1', DataType: 'String' },
                                name: { StringValue: 'testUser', DataType: 'String' },
                            },
                            MessageSystemAttributes: { attribute1: { StringValue: 'attributeValue', DataType: 'String' } },
                            MessageDeduplicationId: 'uniqueId1',
                        },
                        { Id: '1234', MessageBody: '1234' },
                        { Id: '1235', MessageBody: '1235' },
                    ],
                });
            });
            it('should receive system attribute name ApproximateReceiveCount only', async () => {
                const { Messages } = await client.receiveMessage({
                    QueueUrl: queue.QueueUrl,
                    AttributeNames: ['ApproximateReceiveCount'],
                    MaxNumberOfMessages: 1,
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
                    MaxNumberOfMessages: 1,
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
                const { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MaxNumberOfMessages: 1 });
                chai_1.expect(Messages.length).to.deep.equal(1);
            });
            it('should not send same message on next receiveMessage call when VisibilityTimeout is not zero', async () => {
                await client.receiveMessage({ QueueUrl: queue.QueueUrl, VisibilityTimeout: 10 });
                const { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MaxNumberOfMessages: 10 });
                chai_1.expect(Messages.length).to.deep.equal(2);
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
        context('sendMessageBatch', () => {
            let client;
            let queue;
            before(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
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
        context('listQueues', () => {
            let client;
            before(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                await client.createQueue({ QueueName: '1queue1' });
                await client.createQueue({ QueueName: '1queue2' });
                await client.createQueue({ QueueName: '2queue3' });
            });
            it('should return list of all queues', async () => {
                const list = await client.listQueues();
                chai_1.expect(list.QueueUrls).to.deep.equal([
                    `${test_env_1.Env.URL}/api/sqs/sqns/1/1queue1`,
                    `${test_env_1.Env.URL}/api/sqs/sqns/1/1queue2`,
                    `${test_env_1.Env.URL}/api/sqs/sqns/1/2queue3`,
                ]);
            });
            it('should return list of all queues starting with "1q"', async () => {
                const list = await client.listQueues({ QueueNamePrefix: '1q' });
                chai_1.expect(list.QueueUrls).to.deep.equal([
                    `${test_env_1.Env.URL}/api/sqs/sqns/1/1queue1`,
                    `${test_env_1.Env.URL}/api/sqs/sqns/1/1queue2`,
                ]);
            });
        });
        context('deleteQueue', () => {
            let client;
            let queue;
            before(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                queue = await client.createQueue({ QueueName: 'queue1' });
            });
            it('should give error when deleting system queue.', async () => {
                try {
                    await client.deleteQueue({ QueueUrl: `${test_env_1.Env.URL}/api/sqs/${common_1.SYSTEM_QUEUE_NAME.SNS}` });
                    await Promise.reject({ code: 99, message: 'should not reach here.' });
                }
                catch (error) {
                    const { code, message } = error;
                    chai_1.expect({ code, message }).to.deep.equal({ code: 'ReservedQueueName', message: 'Reserved queue name' });
                }
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
        context('getQueueUrl', () => {
            let client;
            let queue;
            before(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
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
                chai_1.expect(result.QueueUrl).to.equal(`${test_env_1.Env.URL}/api/sqs/sqns/1/queue1`);
            });
        });
        context('markEventSuccess', () => {
            let client;
            let storageAdapter;
            let MessageId;
            let queue;
            before(async () => {
                await setup_1.dropDatabase();
                storageAdapter = new base_storage_engine_1.BaseStorageEngine(setup_1.setupConfig.sqnsConfig.db);
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                queue = await client.createQueue({ QueueName: 'queue1' });
                ({ MessageId } = await client.sendMessage({
                    QueueUrl: queue.QueueUrl,
                    MessageAttributes: { type: { StringValue: 'type1', DataType: 'String' } },
                    MessageDeduplicationId: 'uniqueId1',
                    MessageBody: '123',
                }));
            });
            it('should mark event success', async () => {
                await client.markEventSuccess(MessageId, queue.QueueUrl, 'test success message');
                const event = await setup_1.setupConfig.mongoConnection.findOne(storageAdapter.getDBTableName('Event'));
                chai_1.expect(event.state).to.equal('SUCCESS');
                chai_1.expect(event.successResponse).to.equal('test success message');
            });
        });
        context('markEventFailure', () => {
            let client;
            let storageAdapter;
            let MessageId;
            let queue;
            before(async () => {
                await setup_1.dropDatabase();
                storageAdapter = new base_storage_engine_1.BaseStorageEngine(setup_1.setupConfig.sqnsConfig.db);
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                queue = await client.createQueue({ QueueName: 'queue1' });
                ({ MessageId } = await client.sendMessage({
                    QueueUrl: queue.QueueUrl,
                    MessageAttributes: { type: { StringValue: 'type1', DataType: 'String' } },
                    MessageDeduplicationId: 'uniqueId1',
                    MessageBody: '123',
                }));
            });
            it('should mark event failure', async () => {
                await client.markEventFailure(MessageId, queue.QueueUrl, 'test failure message');
                const event = await setup_1.setupConfig.mongoConnection.findOne(storageAdapter.getDBTableName('Event'));
                chai_1.expect(event.state).to.equal('FAILURE');
                chai_1.expect(event.failureResponse).to.equal('test failure message');
            });
        });
        function getQueueARNFromQueueURL(queueURL) {
            const queueURLSplit = queueURL.split('/');
            const queueName = queueURLSplit.pop();
            const companyId = queueURLSplit.pop();
            const region = queueURLSplit.pop();
            return queue_1.Queue.arn(companyId, region, queueName);
        }
        context('Processing of SQS with comparator function in descending order', () => {
            let client;
            let queue;
            let queueARN;
            before(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                queue = await client.createQueue({ QueueName: 'queue1' });
                queueARN = getQueueARNFromQueueURL(queue.QueueUrl);
                setup_1.setupConfig.sqns.queueComparator(queueARN, (item1, item2) => (item1.priority > item2.priority));
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
            after(() => setup_1.setupConfig.sqns.queueComparator(queueARN, undefined));
        });
        context('Processing of SQS with comparator function in ascending order', () => {
            let client;
            let queue;
            let queueARN;
            before(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                queue = await client.createQueue({ QueueName: 'queue1' });
                queueARN = getQueueARNFromQueueURL(queue.QueueUrl);
                setup_1.setupConfig.sqns.queueComparator(queueARN, (item1, item2) => (item1.priority < item2.priority));
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
            after(() => setup_1.setupConfig.sqns.queueComparator(queueARN, undefined));
        });
        context('Processing of SQS with comparator function in descending order for fifo', () => {
            let client;
            let queueARN;
            let queue;
            before(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                queue = await client.createQueue({ QueueName: 'queue1.fifo' });
                queueARN = getQueueARNFromQueueURL(queue.QueueUrl);
                setup_1.setupConfig.sqns.queueComparator(queueARN, (item1, item2) => (item1.priority > item2.priority));
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
            after(() => setup_1.setupConfig.sqns.queueComparator(queueARN, undefined));
        });
        context('Processing of SQS with comparator function in ascending order for fifo', () => {
            let client;
            let queue;
            let queueARN;
            before(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                queue = await client.createQueue({ QueueName: 'queue1.fifo' });
                queueARN = getQueueARNFromQueueURL(queue.QueueUrl);
                setup_1.setupConfig.sqns.queueComparator(queueARN, (item1, item2) => (item1.priority < item2.priority));
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
            after(() => setup_1.setupConfig.sqns.queueComparator(queueARN, undefined));
        });
        context('ErrorHandling', () => {
            before(async () => setup_1.dropDatabase());
            it('should give error while secret key ', async () => {
                try {
                    const client = new s_q_n_s_client_1.SQNSClient({
                        endpoint: `${test_env_1.Env.URL}/api`,
                        accessKeyId: test_env_1.Env.accessKeyId,
                        secretAccessKey: 'InvalidSecretKey',
                    });
                    await client.createQueue({ QueueName: 'queue1' });
                    await Promise.reject({ code: 99, message: 'Should not reach here.' });
                }
                catch (error) {
                    const { code, message } = error;
                    chai_1.expect({ code, message }).deep.equal({
                        code: 'SignatureDoesNotMatch',
                        message: 'The request signature we calculated does not match the signature you provided.',
                    });
                }
            });
        });
        context('SQNS current status', () => {
            let eventManager;
            let queue;
            let user;
            beforeEach(async () => {
                user = new user_1.User({ id: '1234', organizationId: '1' });
                eventManager = new s_q_s_manager_1.SQSManager({
                    endpoint: setup_1.setupConfig.sqnsConfig.endpoint,
                    db: setup_1.setupConfig.sqnsConfig.db,
                    requestTasks: ['https://xyz.abc/success', 'https://xyz.abc/failure'],
                });
                queue = await eventManager.createQueue(user, 'queue1', base_client_1.BaseClient.REGION, {}, {});
                await eventManager.sendMessage(queue, 'messageBody', {}, {});
                eventManager.resetAll(true);
            });
            it('should return current status in prometheus format', async () => {
                const result = eventManager.prometheus(new Date(1000));
                chai_1.expect(result).to.equal('arn_sqns_sqs_sqns_1_queue1_queue_priority{label="PRIORITY_999999"} 1 1000\n'
                    + 'arn_sqns_sqs_sqns_1_queue1_queue_priority{label="PRIORITY_TOTAL"} 1 1000\n'
                    + 'queue_priority{label="PRIORITY_999999"} 1 1000\n'
                    + 'queue_priority{label="PRIORITY_TOTAL"} 1 1000\n');
            });
            it('should delete the queue and reset the status to initial', async () => {
                const queue2 = await eventManager.createQueue(user, 'queue2', base_client_1.BaseClient.REGION, {}, {});
                await eventManager.sendMessage(queue2, 'messageBody', { priority: { StringValue: '1', DataType: 'String' } }, {});
                chai_1.expect(eventManager.prometheus(new Date(1000))).to
                    .equal('arn_sqns_sqs_sqns_1_queue1_queue_priority{label="PRIORITY_999999"} 1 1000\n'
                    + 'arn_sqns_sqs_sqns_1_queue1_queue_priority{label="PRIORITY_TOTAL"} 1 1000\n'
                    + 'arn_sqns_sqs_sqns_1_queue2_queue_priority{label="PRIORITY_1"} 1 1000\n'
                    + 'arn_sqns_sqs_sqns_1_queue2_queue_priority{label="PRIORITY_TOTAL"} 1 1000\n'
                    + 'queue_priority{label="PRIORITY_1"} 1 1000\n'
                    + 'queue_priority{label="PRIORITY_999999"} 1 1000\n'
                    + 'queue_priority{label="PRIORITY_TOTAL"} 2 1000\n');
                await eventManager.deleteQueue(queue2);
                chai_1.expect(eventManager.prometheus(new Date(1000))).to
                    .equal('arn_sqns_sqs_sqns_1_queue1_queue_priority{label="PRIORITY_999999"} 1 1000\n'
                    + 'arn_sqns_sqs_sqns_1_queue1_queue_priority{label="PRIORITY_TOTAL"} 1 1000\n'
                    + 'queue_priority{label="PRIORITY_1"} 0 1000\n'
                    + 'queue_priority{label="PRIORITY_999999"} 1 1000\n'
                    + 'queue_priority{label="PRIORITY_TOTAL"} 1 1000\n');
                await eventManager.deleteQueue(queue);
                chai_1.expect(eventManager.prometheus(new Date(1000))).to.equal('queue_priority{label="PRIORITY_TOTAL"} 0 1000\n');
            });
            it('should send request to given url for notify no events to process.', async () => {
                await eventManager.poll(queue, 20);
                const result = await eventManager.poll(queue, 20);
                chai_1.expect(result).to.not.exist;
            });
            it('should not add event in active processing list while adding event.', async () => {
                await eventManager.sendMessage(queue, 'messageBody1', { priority: { StringValue: '2', DataType: 'String' } }, {}, '100');
                await eventManager.sendMessage(queue, 'messageBody2', { priority: { StringValue: '2', DataType: 'String' } }, {}, '100');
                await eventManager.sendMessage(queue, 'messageBody3', { priority: { StringValue: '2', DataType: 'String' } }, {}, '100');
                await eventManager.sendMessage(queue, 'messageBody4', {}, {}, '100');
                await eventManager.sendMessage(queue, 'messageBody5', {}, {}, '100');
                chai_1.expect(eventManager.eventStats).to.deep.equal({
                    PRIORITY_TOTAL: 1,
                    PRIORITY_2: 0,
                    'arn:sqns:sqs:sqns:1:queue1': { PRIORITY_TOTAL: 1, PRIORITY_2: 0, PRIORITY_999999: 1 },
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
                queueServer = new s_q_n_s_1.SQNS({
                    endpoint: `http://127.0.0.1:${test_env_1.Env.PORT}/api-queue-processing-flow`,
                    adminSecretKeys: [{ accessKey: test_env_1.Env.accessKeyId, secretAccessKey: test_env_1.Env.secretAccessKey }],
                    db: setup_1.setupConfig.sqnsConfig.db,
                    sqs: { cronInterval: '*/2 * * * * *' },
                });
                queueServer.registerExpressRoutes(setup_1.app);
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api-queue-processing-flow`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                queue = await client.createQueue({ QueueName: 'processingFlow' });
                await client.sendMessageBatch({
                    QueueUrl: queue.QueueUrl,
                    Entries: new Array(10).fill(0)
                        .map((item, index) => ({ Id: `${index}`, MessageBody: `Message ${index}`, DelaySeconds: 2 })),
                });
                await setup_1.delay(6 * 1000);
            });
            it('should add items from storage to queue', async () => {
                const stats = await new request_client_1.RequestClient().get(`${test_env_1.Env.URL}/api-queue-processing-flow/queues/events/stats`, true);
                chai_1.expect(stats).to.deep.equal({
                    PRIORITY_TOTAL: 10,
                    PRIORITY_999999: 10,
                    'arn:sqns:sqs:sqns:1:processingFlow': { PRIORITY_TOTAL: 10, PRIORITY_999999: 10 },
                });
            });
            after(() => queueServer.cancel());
        });
    });
    describe('SNS', () => {
        context('createTopic', () => {
            let client;
            beforeEach(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
            });
            it('should create topic', async () => {
                const topicResponse = await client.createTopic({
                    Name: 'Topic1',
                    Attributes: { DisplayName: 'Topic One' },
                    Tags: [{ Key: 'tag1', Value: 'value1' }, { Key: 'tag2', Value: 'value2' }],
                });
                chai_1.expect(topicResponse.TopicArn).to.exist;
                const [item1, item2, item3, item4, item5, item6] = topicResponse.TopicArn.split(':');
                chai_1.expect(item1).to.equal('arn');
                chai_1.expect(item2).to.equal('sqns');
                chai_1.expect(item3).to.equal('sns');
                chai_1.expect(item4).to.equal('sqns');
                chai_1.expect(item5).to.exist;
                chai_1.expect(item6).to.equal('Topic1');
            });
        });
        context('listTopics', () => {
            let client;
            beforeEach(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                await Promise.all(new Array(150).fill(0)
                    .map((i, index) => client.createTopic({ Name: `Topic${index}` })));
            });
            it('should list topics with pagination', async () => {
                let listTopicsResponse = await client.listTopics({});
                chai_1.expect(listTopicsResponse.Topics.length).to.equal(100);
                chai_1.expect(listTopicsResponse.NextToken).to.exist;
                listTopicsResponse = await client.listTopics({ NextToken: listTopicsResponse.NextToken });
                chai_1.expect(listTopicsResponse.Topics.length).to.equal(50);
                chai_1.expect(listTopicsResponse.NextToken).to.not.exist;
            });
        });
        context('getTopicAttributes', () => {
            let client;
            let topic1ARN;
            beforeEach(async () => {
                await setup_1.delay(1000);
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                topic1ARN = (await client.createTopic({
                    Name: 'Topic1',
                    Attributes: { DisplayName: 'Topic One' },
                    Tags: [{ Key: 'tag1', Value: 'value1' }, { Key: 'tag2', Value: 'value2' }],
                })).TopicArn;
            });
            it('should find topic attributes of topic "Topic1"', async () => {
                const topicAttributesResponse = await client.getTopicAttributes({ TopicArn: topic1ARN });
                chai_1.expect(topicAttributesResponse.Attributes.SubscriptionsPending).to.equal('0');
                chai_1.expect(topicAttributesResponse.Attributes.TopicArn).to.equal(topic1ARN);
                chai_1.expect(topicAttributesResponse.Attributes.EffectiveDeliveryPolicy).to.equal('{"default":{"defaultHealthyRetryPolicy":'
                    + '{"numRetries":3,"numNoDelayRetries":0,"minDelayTarget":20,"maxDelayTarget":20,"numMinDelayRetries":0,"numMaxDelayRetries":0,'
                    + '"backoffFunction":"exponential"},"disableOverrides":false}}');
                chai_1.expect(topicAttributesResponse.Attributes.SubscriptionsConfirmed).to.equal('0');
                chai_1.expect(topicAttributesResponse.Attributes.DisplayName).to.equal('Topic One');
                chai_1.expect(topicAttributesResponse.Attributes.SubscriptionsDeleted).to.equal('0');
            });
            it('should give error when arn is invalid.', async () => {
                try {
                    await client.getTopicAttributes({ TopicArn: 'invalid' });
                    await Promise.reject({ code: 99, message: 'should not reach here' });
                }
                catch (error) {
                    const { code, message } = error;
                    chai_1.expect({ code, message }).to.deep.equal({
                        code: 'NotFound',
                        message: 'Topic does not exist.',
                    });
                }
            });
        });
        context('setTopicAttributes', () => {
            let client;
            let topic1ARN;
            beforeEach(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                topic1ARN = (await client.createTopic({
                    Name: 'Topic1',
                    Attributes: { DisplayName: 'Topic One' },
                    Tags: [{ Key: 'tag1', Value: 'value1' }, { Key: 'tag2', Value: 'value2' }],
                })).TopicArn;
            });
            it('should update new attributes', async () => {
                await client.setTopicAttributes({
                    AttributeName: 'DisplayName',
                    TopicArn: topic1ARN,
                    AttributeValue: 'Updated Topic One',
                });
                await client.setTopicAttributes({
                    AttributeName: 'NewFieldName',
                    TopicArn: topic1ARN,
                    AttributeValue: 'New field value',
                });
                const topicAttributesResponse = await client.getTopicAttributes({ TopicArn: topic1ARN });
                chai_1.expect(topicAttributesResponse.Attributes.DisplayName).to.equal('Updated Topic One');
                chai_1.expect(topicAttributesResponse.Attributes.NewFieldName).to.equal('New field value');
            });
        });
        context('deleteTopic', () => {
            let topicARN;
            let client;
            beforeEach(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                topicARN = (await client.createTopic({
                    Name: 'Topic1',
                    Attributes: { DisplayName: 'Topic One' },
                    Tags: [{ Key: 'tag1', Value: 'value1' }, { Key: 'tag2', Value: 'value2' }],
                })).TopicArn;
            });
            it('should delete topic', async () => {
                const topicResponse = await client.deleteTopic({ TopicArn: topicARN });
                chai_1.expect(topicResponse).to.exist;
            });
        });
        context('publish', () => {
            let client;
            let topic;
            beforeEach(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                topic = await client.createTopic({ Name: 'Topic1' });
            });
            it('should publish message', async () => {
                const result = await client.publish({
                    Message: 'This is message',
                    TopicArn: topic.TopicArn,
                    TargetArn: topic.TopicArn,
                    PhoneNumber: '9999999999',
                    Subject: 'Subject',
                    MessageAttributes: { key1: { DataType: 'String', StringValue: 'value' } },
                });
                chai_1.expect(result.MessageId).to.to.exist;
                const queue = await client.createQueue({ QueueName: common_1.SYSTEM_QUEUE_NAME.SNS });
                const { Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl });
                chai_1.expect(event).to.exist;
                chai_1.expect(event.MessageId).to.exist;
                chai_1.expect(event.Body).to.equal(`scan_publish_${result.MessageId}`);
            });
            it('should give error when MessageStructure is not supported', async () => {
                try {
                    await client.publish({
                        Message: 'This is message',
                        TopicArn: topic.TopicArn,
                        TargetArn: topic.TopicArn,
                        PhoneNumber: '9999999999',
                        Subject: 'Subject',
                        MessageStructure: '{ "unsupported": "x" }',
                        MessageAttributes: { key1: { DataType: 'String', StringValue: 'value' } },
                    });
                    await Promise.reject({ code: 99, message: 'should not reach here.' });
                }
                catch (error) {
                    const { code, message } = error;
                    chai_1.expect({ code, message }).to.deep.equal({
                        code: '412',
                        message: '"unsupported" is not supported channel.',
                    });
                }
            });
            it('should give error when MessageStructure value is not string', async () => {
                try {
                    await client.publish({
                        Message: 'This is message',
                        TopicArn: topic.TopicArn,
                        TargetArn: topic.TopicArn,
                        PhoneNumber: '9999999999',
                        Subject: 'Subject',
                        MessageStructure: '{ "default": 1 }',
                        MessageAttributes: { key1: { DataType: 'String', StringValue: 'value' } },
                    });
                    await Promise.reject({ code: 99, message: 'should not reach here.' });
                }
                catch (error) {
                    const { code, message } = error;
                    chai_1.expect({ code, message }).to.deep.equal({
                        code: '412',
                        message: '"default" value "1" is not string.',
                    });
                }
            });
        });
        context('subscribe', () => {
            let client;
            let topic;
            beforeEach(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                topic = await client.createTopic({ Name: 'Topic1' });
            });
            it('should give error when protocol is not supported', async () => {
                try {
                    await client.subscribe({
                        TopicArn: topic.TopicArn,
                        Attributes: { key: 'value' },
                        Endpoint: 'http://test.sns.subscription/valid',
                        Protocol: 'app',
                    });
                    await Promise.reject({ code: 99, message: 'should not reach here.' });
                }
                catch (error) {
                    const { code, message } = error;
                    chai_1.expect({ code, message }).to.deep.equal({
                        code: 'InvalidParameter',
                        message: 'Invalid parameter: Does not support this protocol string: app',
                    });
                }
            });
            it('should return subscriptionARN as PendingConfirmation', async () => {
                const result = await client.subscribe({
                    TopicArn: topic.TopicArn,
                    Attributes: { key: 'value' },
                    Endpoint: 'http://test.sns.subscription/valid',
                    Protocol: 'http',
                });
                chai_1.expect(result.SubscriptionArn).to.equal('PendingConfirmation');
            });
            it('should return subscriptionARN when ReturnSubscriptionArn is true', async () => {
                const result = await client.subscribe({
                    TopicArn: topic.TopicArn,
                    Attributes: { key: 'value' },
                    Endpoint: 'http://test.sns.subscription/valid',
                    Protocol: 'http',
                    ReturnSubscriptionArn: true,
                });
                chai_1.expect(result.SubscriptionArn.startsWith(`${topic.TopicArn}:`)).to.be.true;
            });
        });
        context('listSubscriptions', () => {
            let topicArn;
            let client;
            beforeEach(async () => {
                await setup_1.delay(100);
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                topicArn = (await client.createTopic({ Name: 'Topic1' })).TopicArn;
                await Promise.all(new Array(150).fill(0)
                    .map((i, index) => client.subscribe({
                    TopicArn: topicArn,
                    Attributes: { key: 'value' },
                    Endpoint: `http://test.sns.subscription/valid${index}`,
                    Protocol: 'http',
                })));
            });
            it('should list subscriptions with pagination', async () => {
                let listSubscriptionsResponse = await client.listSubscriptions({});
                chai_1.expect(listSubscriptionsResponse.Subscriptions.length).to.equal(100);
                chai_1.expect(listSubscriptionsResponse.NextToken).to.exist;
                listSubscriptionsResponse = await client.listSubscriptions({ NextToken: listSubscriptionsResponse.NextToken });
                chai_1.expect(listSubscriptionsResponse.Subscriptions.length).to.equal(50);
                chai_1.expect(listSubscriptionsResponse.NextToken).to.not.exist;
            });
        });
        context('listSubscriptionsByTopic', () => {
            let topic1Arn;
            let topic2Arn;
            let client;
            beforeEach(async () => {
                await setup_1.dropDatabase();
                await setup_1.delay(200);
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                topic1Arn = (await client.createTopic({ Name: 'Topic1' })).TopicArn;
                topic2Arn = (await client.createTopic({ Name: 'Topic2' })).TopicArn;
                await Promise.all(new Array(150).fill(0)
                    .map((i, index) => client.subscribe({
                    TopicArn: topic1Arn,
                    Attributes: { key: 'value' },
                    Endpoint: `http://test.sns.subscription/valid${index}`,
                    Protocol: 'http',
                })));
                await Promise.all(new Array(49).fill(0)
                    .map((i, index) => client.subscribe({
                    TopicArn: topic2Arn,
                    Attributes: { key: 'value' },
                    Endpoint: `http://test.sns.subscription/valid${index}`,
                    Protocol: 'http',
                })));
            });
            it('should list subscriptions for topic', async () => {
                let listTopic1SubscriptionsResponse = await client.listSubscriptionsByTopic({ TopicArn: topic1Arn });
                chai_1.expect(listTopic1SubscriptionsResponse.Subscriptions.length).to.equal(100);
                chai_1.expect(listTopic1SubscriptionsResponse.NextToken).to.exist;
                listTopic1SubscriptionsResponse = await client.listSubscriptionsByTopic({
                    TopicArn: topic1Arn,
                    NextToken: listTopic1SubscriptionsResponse.NextToken,
                });
                chai_1.expect(listTopic1SubscriptionsResponse.Subscriptions.length).to.equal(50);
                chai_1.expect(listTopic1SubscriptionsResponse.NextToken).to.not.exist;
                const listTopic2SubscriptionsResponse = await client.listSubscriptionsByTopic({ TopicArn: topic2Arn });
                chai_1.expect(listTopic2SubscriptionsResponse.Subscriptions.length).to.equal(49);
                chai_1.expect(listTopic2SubscriptionsResponse.NextToken).to.not.exist;
                let listSubscriptionsResponse = await client.listSubscriptions({});
                chai_1.expect(listSubscriptionsResponse.Subscriptions.length).to.equal(100);
                chai_1.expect(listSubscriptionsResponse.NextToken).to.exist;
                listSubscriptionsResponse = await client.listSubscriptions({ NextToken: listSubscriptionsResponse.NextToken });
                chai_1.expect(listSubscriptionsResponse.Subscriptions.length).to.equal(99);
                chai_1.expect(listSubscriptionsResponse.NextToken).to.not.exist;
            });
        });
        context('confirmSubscription', () => {
            let client;
            let topic;
            beforeEach(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                topic = await client.createTopic({ Name: 'Topic1' });
            });
            it('should give error when Token is invalid.', async () => {
                try {
                    await client.confirmSubscription({ Token: 'InvalidToken', TopicArn: 'InvalidTopicArn' });
                    await Promise.reject({ code: 99, message: 'should not reach here.' });
                }
                catch (error) {
                    const { code, message } = error;
                    chai_1.expect({ code, message }).to.deep.equal({ code: 'InvalidParameter', message: 'Invalid token' });
                }
            });
            it('should confirm subscription', async () => {
                const promise = new Promise((resolve) => {
                    nock_1.default('http://test.sns.subscription')
                        .persist()
                        .post('/valid', () => true)
                        // eslint-disable-next-line func-names
                        .reply(200, async function (path, body) {
                        chai_1.expect(this.req.headers['x-sqns-sns-message-id'][0]).to.equal(body.MessageId);
                        chai_1.expect(this.req.headers['x-sqns-sns-message-type'][0]).to.equal('SubscriptionConfirmation');
                        chai_1.expect(this.req.headers['x-sqns-sns-topic-arn'][0]).to.equal(topic.TopicArn);
                        chai_1.expect(body.Type).to.equal('SubscriptionConfirmation');
                        chai_1.expect(body.TopicArn).to.equal(topic.TopicArn);
                        chai_1.expect(body.Message).to.equal(`You have chosen to subscribe to the topic ${topic.TopicArn}.\n`
                            + 'To confirm the subscription, visit the SubscribeURL included in this message.');
                        chai_1.expect(body.SubscribeURL).to.equal(`${test_env_1.Env.URL}/api/sns?Action=SubscriptionConfirmation&TopicArn=${topic.TopicArn}&Token=${body.Token}`);
                        chai_1.expect(body.Token).to.exist;
                        chai_1.expect(body.MessageId).to.exist;
                        chai_1.expect(body.Timestamp).to.exist;
                        const result = await client.confirmSubscription({ TopicArn: body.TopicArn, Token: body.Token });
                        resolve(result);
                        return {};
                    });
                });
                const [subscriptionResponse] = await Promise.all([
                    promise,
                    client.subscribe({
                        TopicArn: topic.TopicArn,
                        Attributes: { key: 'value' },
                        Endpoint: 'http://test.sns.subscription/valid',
                        Protocol: 'http',
                    }),
                ]);
                chai_1.expect(subscriptionResponse.SubscriptionArn.startsWith(`${topic.TopicArn}:`)).to.be.true;
                const result = await client.subscribe({
                    TopicArn: topic.TopicArn,
                    Attributes: { key: 'value' },
                    Endpoint: 'http://test.sns.subscription/valid',
                    Protocol: 'http',
                });
                chai_1.expect(result.SubscriptionArn.startsWith(`${topic.TopicArn}:`)).to.be.true;
            });
            it('should confirm subscription via SubscribeURL', async () => {
                const promise = new Promise((resolve) => {
                    nock_1.default('http://test.sns.subscription')
                        .persist()
                        .post('/valid', () => true)
                        .reply(200, async (path, body) => {
                        chai_1.expect(body.SubscribeURL).to.equal(`${test_env_1.Env.URL}/api/sns?Action=SubscriptionConfirmation&TopicArn=${topic.TopicArn}&Token=${body.Token}`);
                        await new request_client_1.RequestClient().get(body.SubscribeURL);
                        resolve();
                        return {};
                    });
                });
                await Promise.all([
                    promise,
                    client.subscribe({
                        TopicArn: topic.TopicArn,
                        Attributes: { key: 'value' },
                        Endpoint: 'http://test.sns.subscription/valid',
                        Protocol: 'http',
                    }),
                ]);
                const result = await client.subscribe({
                    TopicArn: topic.TopicArn,
                    Attributes: { key: 'value' },
                    Endpoint: 'http://test.sns.subscription/valid',
                    Protocol: 'http',
                });
                chai_1.expect(result.SubscriptionArn.startsWith(`${topic.TopicArn}:`)).to.be.true;
            });
            afterEach(() => nock_1.default.cleanAll());
        });
        context('unsubscribe', () => {
            let subscriptionArn;
            let topicARN;
            let client;
            beforeEach(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                topicARN = (await client.createTopic({
                    Name: 'Topic1',
                    Attributes: { DisplayName: 'Topic One' },
                    Tags: [{ Key: 'tag1', Value: 'value1' }, { Key: 'tag2', Value: 'value2' }],
                })).TopicArn;
                subscriptionArn = (await client.subscribe({
                    TopicArn: topicARN,
                    Attributes: { key: 'value' },
                    Endpoint: 'http://test.sns.subscription/valid',
                    Protocol: 'http',
                    ReturnSubscriptionArn: true,
                })).SubscriptionArn;
            });
            it('should unsubscribe subscription', async () => {
                await client.unsubscribe({ SubscriptionArn: subscriptionArn });
                const result = await client.listSubscriptions({});
                chai_1.expect(result.Subscriptions.length).to.equal(0);
            });
            it('should unsubscribe subscription when topic is deleted', async () => {
                await client.deleteTopic({ TopicArn: topicARN });
                const result = await client.listSubscriptions({});
                chai_1.expect(result.Subscriptions.length).to.equal(0);
            });
        });
        context('getPublish', () => {
            let client;
            beforeEach(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
            });
            it('should give error when MessageId is invalid.', async () => {
                try {
                    await client.getPublish({ MessageId: 'InvalidMessageId' });
                    await Promise.reject({ code: 99, message: 'should not reach here.' });
                }
                catch (error) {
                    const { code, message } = error;
                    chai_1.expect({ code, message }).to.deep.equal({ code: 'NotFound', message: 'Publish does not exist.' });
                }
            });
        });
        context('getSubscription', () => {
            let client;
            beforeEach(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
            });
            it('should give error when subscription ARN is invalid.', async () => {
                try {
                    await client.getSubscription({ SubscriptionArn: 'InvalidSubscriptionARN' });
                    await Promise.reject({ code: 99, message: 'should not reach here.' });
                }
                catch (error) {
                    const { code, message } = error;
                    chai_1.expect({ code, message }).to.deep.equal({ code: 'NotFound', message: 'Subscription does not exist.' });
                }
            });
        });
        context('markPublished', () => {
            let storageAdapter;
            let client;
            let MessageId;
            beforeEach(async () => {
                await setup_1.dropDatabase();
                storageAdapter = new base_storage_engine_1.BaseStorageEngine(setup_1.setupConfig.sqnsConfig.db);
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                const topic = await client.createTopic({ Name: 'Topic1' });
                const result = await client.publish({
                    Message: 'This is message',
                    TopicArn: topic.TopicArn,
                    TargetArn: topic.TopicArn,
                    PhoneNumber: '9999999999',
                    Subject: 'Subject',
                    MessageAttributes: { key1: { DataType: 'String', StringValue: 'value' } },
                });
                ({ MessageId } = result);
            });
            it('should mark published when all subscriptions are processed.', async () => {
                await client.markPublished({ MessageId });
                const result = await setup_1.setupConfig.mongoConnection.findOne(storageAdapter.getDBTableName('Publish'));
                chai_1.expect(result.Status).to.equal('Published');
            });
        });
        context('error handling', () => {
            const requestClient = new request_client_1.RequestClient();
            async function request(request) {
                const headers = {
                    'x-amz-date': moment_1.default().utc().format('YYYYMMDDTHHmmss'),
                    host: request.uri.split('/')[2],
                };
                const authorization = authentication_1.generateAuthenticationHash({
                    service: 'sns',
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                    region: base_client_1.BaseClient.REGION,
                    date: headers['x-amz-date'],
                    originalUrl: request.uri.split(headers.host)[1],
                    host: headers.host,
                    method: request.method,
                    body: request.body || {},
                });
                request.headers = { ...(request.headers || {}), ...headers, authorization };
                await (request.method === 'GET'
                    ? requestClient.get(request.uri)
                    : requestClient.post(request.uri, { headers: request.headers, body: JSON.stringify(request.body) }))
                    .catch((error) => new Promise((resolve, reject) => {
                    xml2js_1.parseString(error.message, (parserError, result) => {
                        if (parserError) {
                            reject(new s_q_n_s_error_1.SQNSError({ code: error.statusCode, message: error.error }));
                            return;
                        }
                        const { Code: [code], Message: [message] } = result.ErrorResponse.Error[0];
                        reject(new s_q_n_s_error_1.SQNSError({ code, message }));
                    });
                }));
            }
            it('should give error when action is not supported for POST method', async () => {
                try {
                    await request({ uri: `${test_env_1.Env.URL}/api/sns`, method: 'POST', body: { Action: 'NotSupportedAction' } });
                    await Promise.reject({ code: 99, message: 'should not reach here' });
                }
                catch (error) {
                    const { code, message } = error;
                    chai_1.expect({ code, message }).to.deep.equal({
                        code: 'UnhandledFunction',
                        message: '"NotSupportedAction" function is not supported.',
                    });
                }
            });
            it('should give error when action is not supported for GET method', async () => {
                try {
                    await request({ uri: `${test_env_1.Env.URL}/api/sns?Action=NotSupportedAction`, method: 'GET' });
                    await Promise.reject({ code: 99, message: 'should not reach here' });
                }
                catch (error) {
                    const { code, message } = error;
                    chai_1.expect({ code, message }).to.deep.equal({
                        code: 'UnhandledFunction',
                        message: '"NotSupportedAction" function is not supported.',
                    });
                }
            });
            it('should handle error when response is not json ', async () => {
                try {
                    nock_1.default(test_env_1.Env.URL).persist().post('/api/sns', () => true).reply(200, { reply: 'json' });
                    const client = new s_q_n_s_client_1.SQNSClient({
                        endpoint: `${test_env_1.Env.URL}/api`,
                        accessKeyId: test_env_1.Env.accessKeyId,
                        secretAccessKey: test_env_1.Env.secretAccessKey,
                    });
                    await client.getPublish({ MessageId: 'test' });
                    await Promise.reject({ code: 99, message: 'should not reach here.' });
                }
                catch (error) {
                    const { code, message } = error;
                    chai_1.expect({ code, message }).to.deep.equal({
                        code: 'Error',
                        message: 'Non-whitespace before first tag.\nLine: 0\nColumn: 1\nChar: {',
                    });
                }
            });
            afterEach(() => nock_1.default.cleanAll());
        });
        context('createTopicAttributes', () => {
            let client;
            beforeEach(async () => {
                await setup_1.dropDatabase();
                client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
            });
            async function checkForCreateTopicAttributes(topicARN, name, deliveryPolicy) {
                const topicAttributesResponse = await client.getTopicAttributes({ TopicArn: topicARN });
                chai_1.expect(topicAttributesResponse.Attributes.SubscriptionsPending).to.equal('0');
                chai_1.expect(topicAttributesResponse.Attributes.TopicArn).to.equal(topicARN);
                chai_1.expect(topicAttributesResponse.Attributes.EffectiveDeliveryPolicy).to.equal(deliveryPolicy);
                chai_1.expect(topicAttributesResponse.Attributes.SubscriptionsConfirmed).to.equal('0');
                chai_1.expect(topicAttributesResponse.Attributes.DisplayName).to.equal(name);
                chai_1.expect(topicAttributesResponse.Attributes.SubscriptionsDeleted).to.equal('0');
            }
            it('should set the DeliveryPolicy provided', async () => {
                const topicARN = (await client.createTopic({
                    Name: 'TopicDeliveryPolicy',
                    Attributes: {
                        DisplayName: 'Topic Delivery Policy',
                        DeliveryPolicy: '{"default":{"defaultHealthyRetryPolicy":'
                            + '{"numRetries":1,"numNoDelayRetries":2,"minDelayTarget":3,"maxDelayTarget":4,"numMinDelayRetries":5,"numMaxDelayRetries":6,'
                            + '"backoffFunction":"linear"},"disableOverrides":false}}',
                    },
                    Tags: [{ Key: 'tag1', Value: 'value1' }, { Key: 'tag2', Value: 'value2' }],
                })).TopicArn;
                await checkForCreateTopicAttributes(topicARN, 'Topic Delivery Policy', '{"default":{"defaultHealthyRetryPolicy":'
                    + '{"numRetries":1,"numNoDelayRetries":2,"minDelayTarget":3,"maxDelayTarget":4,"numMinDelayRetries":5,"numMaxDelayRetries":6,'
                    + '"backoffFunction":"linear"},"disableOverrides":false}}');
            });
            it('should use the default delivery policy when DeliveryPolicy provided is invalid json', async () => {
                try {
                    await client.createTopic({
                        Name: 'TopicInvalidJSONDeliveryPolicy',
                        Attributes: {
                            DisplayName: 'Topic Invalid JSON Delivery Policy',
                            DeliveryPolicy: '"http":{"defaultHealthyRetryPolicy":'
                                + '{"numRetries":1,"numNoDelayRetries":2,"minDelayTarget":3,"maxDelayTarget":4,"numMinDelayRetries":5,'
                                + '"numMaxDelayRetries":6,"backoffFunction":"linear"},"disableOverrides":false}}',
                        },
                        Tags: [{ Key: 'tag1', Value: 'value1' }, { Key: 'tag2', Value: 'value2' }],
                    });
                    await Promise.reject({ code: 99, message: 'should not reach here.' });
                }
                catch (error) {
                    const { code, message } = error;
                    chai_1.expect({ code, message }).to.deep.equal({
                        code: 'InvalidDeliveryPolicy',
                        message: 'Unexpected token : in JSON at position 6',
                    });
                }
            });
            it('should use the default delivery policy when DeliveryPolicy provided some filed is missing', async () => {
                try {
                    await client.createTopic({
                        Name: 'TopicFieldMissingDeliveryPolicy',
                        Attributes: {
                            DisplayName: 'Topic Field Missing Delivery Policy',
                            DeliveryPolicy: '{"default":{"defaultHealthyRetryPolicy":'
                                + '{"numNoDelayRetries":2,"minDelayTarget":3,"maxDelayTarget":4,"numMinDelayRetries":5,"numMaxDelayRetries":6,'
                                + '"backoffFunction":"linear"},"disableOverrides":false}}',
                        },
                        Tags: [{ Key: 'tag1', Value: 'value1' }, { Key: 'tag2', Value: 'value2' }],
                    });
                    await Promise.reject({ code: 99, message: 'should not reach here.' });
                }
                catch (error) {
                    const { code, message } = error;
                    chai_1.expect({ code, message }).to.deep.equal({
                        code: 'InvalidDeliveryPolicy',
                        message: 'Different keys',
                    });
                }
            });
            it('should use the default delivery policy when DeliveryPolicy provided some filed is wrongly named', async () => {
                try {
                    await client.createTopic({
                        Name: 'TopicFieldMissingDeliveryPolicy',
                        Attributes: {
                            DisplayName: 'Topic Field Missing Delivery Policy',
                            DeliveryPolicy: '{"default":{"defaultHealthyRetryPolicy":'
                                + '{"numRetries1":1, "numNoDelayRetries":2,"minDelayTarget":3,"maxDelayTarget":4,"numMinDelayRetries":5,'
                                + '"numMaxDelayRetries":6,"backoffFunction":"linear"},"disableSubscriptionOverrides":false}}',
                        },
                        Tags: [{ Key: 'tag1', Value: 'value1' }, { Key: 'tag2', Value: 'value2' }],
                    });
                    await Promise.reject({ code: 99, message: 'should not reach here.' });
                }
                catch (error) {
                    const { code, message } = error;
                    chai_1.expect({ code, message }).to.deep.equal({
                        code: 'InvalidDeliveryPolicy',
                        message: '"numRetries1" missing.',
                    });
                }
            });
            it('should use the default delivery policy when DeliveryPolicy provided has unsupported backoffFunction', async () => {
                try {
                    await client.createTopic({
                        Name: 'TopicFieldMissingDeliveryPolicy',
                        Attributes: {
                            DisplayName: 'Topic Field Missing Delivery Policy',
                            DeliveryPolicy: '{"default":{"defaultHealthyRetryPolicy":'
                                + '{"numRetries":1, "numNoDelayRetries":2,"minDelayTarget":3,"maxDelayTarget":4,"numMinDelayRetries":5,'
                                + '"numMaxDelayRetries":6,"backoffFunction":"unsupportedBackOffFunction"},"disableOverrides":false}}',
                        },
                        Tags: [{ Key: 'tag1', Value: 'value1' }, { Key: 'tag2', Value: 'value2' }],
                    });
                    await Promise.reject({ code: 99, message: 'should not reach here.' });
                }
                catch (error) {
                    const { code, message } = error;
                    chai_1.expect({ code, message }).to.deep.equal({
                        code: 'InvalidDeliveryPolicy',
                        message: '"unsupportedBackOffFunction" backoffFunction invalid.',
                    });
                }
            });
        });
    });
});
//# sourceMappingURL=s-q-n-s-client.spec.js.map