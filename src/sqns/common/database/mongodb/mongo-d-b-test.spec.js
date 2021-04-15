"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const moment_1 = __importDefault(require("moment"));
const setup_1 = require("../../../../setup");
const test_env_1 = require("../../../../test-env");
const s_q_n_s_client_1 = require("../../../s-q-n-s-client");
const worker_event_scheduler_1 = require("../../../scheduler/scheduler-worker/worker-event-scheduler");
const base_storage_engine_1 = require("../../model/base-storage-engine");
const request_client_1 = require("../../request-client/request-client");
const mongo_d_b_adapter_1 = require("./mongo-d-b-adapter");
describe('mongoDB test cases', () => {
    context('SlaveEventSchedulerSpec', () => {
        let storageAdapter;
        let slaveScheduler;
        let queue;
        let client;
        beforeEach(async () => {
            await setup_1.dropDatabase();
            storageAdapter = new base_storage_engine_1.BaseStorageEngine(setup_1.setupConfig.sqnsConfig.db, []);
            client = new s_q_n_s_client_1.SQNSClient({
                endpoint: `${test_env_1.Env.URL}/api`,
                accessKeyId: test_env_1.Env.accessKeyId,
                secretAccessKey: test_env_1.Env.secretAccessKey,
            });
            queue = await client.createQueue({ QueueName: 'queue1' });
        });
        it('should call failure api when request fails in mongoDB. for exponential retry', async () => {
            const time = new Date().getTime() / -1000;
            await client.sendMessageBatch({
                QueueUrl: queue.QueueUrl,
                Entries: [
                    { Id: '123', MessageBody: '123', DelaySeconds: time },
                    { Id: '1234', MessageBody: '1234', DelaySeconds: time + 60 },
                    { Id: '1235', MessageBody: '1235', DelaySeconds: time + 120 },
                ],
            });
            await new Promise((resolve) => {
                let count = 0;
                slaveScheduler = new worker_event_scheduler_1.WorkerEventScheduler({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                }, ['queue1'], async () => {
                    count += 1;
                    if (count === 2) {
                        return Promise.resolve('this is success message');
                    }
                    if (count === 3) {
                        setTimeout(resolve, 0);
                        return new Promise(() => 0);
                    }
                    return Promise.reject('Error in processing');
                }, '*/2 * * * * *');
            });
            await setup_1.delay();
            const stats = await new request_client_1.RequestClient().get(`${test_env_1.Env.URL}/api/queues/events/stats`, true);
            chai_1.expect(stats).to.deep.equal({
                PRIORITY_TOTAL: 0,
                'arn:sqns:sqs:sqns:1:queue1': { PRIORITY_TOTAL: 0, PRIORITY_999999: 0 },
                PRIORITY_999999: 0,
            });
            const items = await setup_1.setupConfig.mongoConnection.find(storageAdapter.getDBTableName('Event'), {}, { originalEventTime: 1 });
            chai_1.expect(moment_1.default(items[0].originalEventTime).utc().format('YYYY-MM-DDTHH:mm')).to.equal('1970-01-01T00:00');
            chai_1.expect(moment_1.default(items[1].originalEventTime).utc().format('YYYY-MM-DDTHH:mm')).to.equal('1970-01-01T00:01');
            chai_1.expect(moment_1.default(items[2].originalEventTime).utc().format('YYYY-MM-DDTHH:mm')).to.equal('1970-01-01T00:02');
            items.forEach((item_) => {
                const item = item_;
                chai_1.expect(item._id).to.exist;
                chai_1.expect(item.createdAt).to.exist;
                chai_1.expect(item.updatedAt).to.exist;
                chai_1.expect(moment_1.default(item.eventTime).diff(moment_1.default(), 'seconds'), 'delay in event min time').to.be.at.least(58);
                chai_1.expect(moment_1.default(item.eventTime).diff(moment_1.default(), 'seconds'), 'delay in event max time').to.be.at.most(60);
                chai_1.expect(moment_1.default(item.sentTime).valueOf(), 'sentTime same firstSentTime').to.equal(moment_1.default(item.firstSentTime).valueOf());
                chai_1.expect(moment_1.default(item.sentTime).valueOf(), 'sentTime min value').is.greaterThan(moment_1.default().add(-5, 'second').valueOf());
                chai_1.expect(moment_1.default(item.sentTime).valueOf(), 'sent time max value').is.at.most(moment_1.default().valueOf());
                delete item._id;
                delete item.eventTime;
                delete item.originalEventTime;
                delete item.firstSentTime;
                delete item.sentTime;
                delete item.createdAt;
                delete item.updatedAt;
            });
            chai_1.expect(JSON.parse(JSON.stringify(items))).to.deep.equal([{
                    priority: 999999,
                    receiveCount: 1,
                    MessageSystemAttribute: {},
                    maxReceiveCount: 3,
                    data: {},
                    queueARN: 'arn:sqns:sqs:sqns:1:queue1',
                    MessageBody: '123',
                    MessageAttribute: {},
                    state: 'FAILURE',
                    processingResponse: 'sent to slave',
                    failureResponse: 'Event marked failed without response.',
                    DeliveryPolicy: {
                        numRetries: 3,
                        numNoDelayRetries: 0,
                        minDelayTarget: 20,
                        maxDelayTarget: 20,
                        numMinDelayRetries: 0,
                        numMaxDelayRetries: 0,
                        backoffFunction: 'exponential',
                    },
                }, {
                    priority: 999999,
                    receiveCount: 1,
                    MessageSystemAttribute: {},
                    maxReceiveCount: 3,
                    data: {},
                    queueARN: 'arn:sqns:sqs:sqns:1:queue1',
                    MessageBody: '1234',
                    MessageAttribute: {},
                    state: 'PROCESSING',
                    processingResponse: 'sent to slave',
                    DeliveryPolicy: {
                        numRetries: 3,
                        numNoDelayRetries: 0,
                        minDelayTarget: 20,
                        maxDelayTarget: 20,
                        numMinDelayRetries: 0,
                        numMaxDelayRetries: 0,
                        backoffFunction: 'exponential',
                    },
                }, {
                    priority: 999999,
                    receiveCount: 1,
                    MessageSystemAttribute: {},
                    maxReceiveCount: 3,
                    data: {},
                    queueARN: 'arn:sqns:sqs:sqns:1:queue1',
                    MessageBody: '1235',
                    MessageAttribute: {},
                    state: 'SUCCESS',
                    processingResponse: 'sent to slave',
                    successResponse: 'this is success message',
                    DeliveryPolicy: {
                        numRetries: 3,
                        numNoDelayRetries: 0,
                        minDelayTarget: 20,
                        maxDelayTarget: 20,
                        numMinDelayRetries: 0,
                        numMaxDelayRetries: 0,
                        backoffFunction: 'exponential',
                    },
                }]);
        });
        it('should call failure api when request fails in mongoDB. for linear retry', async () => {
            const time = new Date().getTime() / -1000;
            const deliveryPolicy = {
                numRetries: 3,
                numNoDelayRetries: 0,
                minDelayTarget: 20,
                maxDelayTarget: 20,
                numMinDelayRetries: 0,
                numMaxDelayRetries: 0,
                backoffFunction: 'linear',
            };
            const messageAttributes = {
                DeliveryPolicy: { DataType: 'String', StringValue: JSON.stringify(deliveryPolicy) },
            };
            await client.sendMessageBatch({
                QueueUrl: queue.QueueUrl,
                Entries: [
                    { Id: '123', MessageBody: '123', DelaySeconds: time, MessageAttributes: messageAttributes },
                    { Id: '1234', MessageBody: '1234', DelaySeconds: time + 60, MessageAttributes: messageAttributes },
                    { Id: '1235', MessageBody: '1235', DelaySeconds: time + 120, MessageAttributes: messageAttributes },
                ],
            });
            await new Promise((resolve) => {
                let count = 0;
                slaveScheduler = new worker_event_scheduler_1.WorkerEventScheduler({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                }, ['queue1'], async () => {
                    count += 1;
                    if (count === 2) {
                        return Promise.resolve('this is success message');
                    }
                    if (count === 3) {
                        setTimeout(resolve, 0);
                        return new Promise(() => 0);
                    }
                    return Promise.reject('Error in processing');
                }, '*/2 * * * * *');
            });
            await setup_1.delay();
            const items = await setup_1.setupConfig.mongoConnection.find(storageAdapter.getDBTableName('Event'), {}, { originalEventTime: 1 });
            items.forEach((item) => {
                chai_1.expect(moment_1.default(item.eventTime).diff(moment_1.default(), 'seconds'), 'delay in event min time').to.be.at.least(598);
                chai_1.expect(moment_1.default(item.eventTime).diff(moment_1.default(), 'seconds'), 'delay in event max time').to.be.at.most(600);
                chai_1.expect(moment_1.default(item.sentTime).valueOf(), 'sentTime same firstSentTime').to.equal(moment_1.default(item.firstSentTime).valueOf());
                chai_1.expect(moment_1.default(item.sentTime).valueOf(), 'sentTime min value').is.greaterThan(moment_1.default().add(-5, 'second').valueOf());
                chai_1.expect(moment_1.default(item.sentTime).valueOf(), 'sent time max value').is.at.most(moment_1.default().valueOf());
            });
        });
        afterEach(() => slaveScheduler === null || slaveScheduler === void 0 ? void 0 : slaveScheduler.cancel());
    });
    context('retry of failed events', () => {
        let storageAdapter;
        let slaveScheduler;
        let queue;
        let client;
        beforeEach(async () => {
            await setup_1.dropDatabase();
            storageAdapter = new base_storage_engine_1.BaseStorageEngine(setup_1.setupConfig.sqnsConfig.db, []);
            client = new s_q_n_s_client_1.SQNSClient({
                endpoint: `${test_env_1.Env.URL}/api`,
                accessKeyId: test_env_1.Env.accessKeyId,
                secretAccessKey: test_env_1.Env.secretAccessKey,
            });
            queue = await client.createQueue({ QueueName: 'queue1' });
            await client.sendMessageBatch({
                QueueUrl: queue.QueueUrl,
                Entries: [{ Id: '123', MessageBody: '123' }],
            });
            await setup_1.delay();
        });
        it('should update event status as failed when event is not processed successfully', async () => {
            await new Promise((resolve) => {
                slaveScheduler = new worker_event_scheduler_1.WorkerEventScheduler({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                }, ['queue1'], () => {
                    setTimeout(resolve, 0);
                    return Promise.reject('Error in processing');
                }, '*/2 * * * * *');
            });
            await setup_1.delay();
            const stats = await new request_client_1.RequestClient().get(`${test_env_1.Env.URL}/api/queues/events/stats`, true);
            chai_1.expect(stats).to.deep.equal({
                PRIORITY_TOTAL: 0,
                'arn:sqns:sqs:sqns:1:queue1': { PRIORITY_TOTAL: 0, PRIORITY_999999: 0 },
                PRIORITY_999999: 0,
            });
            const items = await setup_1.setupConfig.mongoConnection.find(storageAdapter.getDBTableName('Event'), {}, { eventTime: -1 });
            items.forEach((item_) => {
                const item = item_;
                delete item.createdAt;
                delete item.updatedAt;
                delete item._id;
                delete item.sentTime;
                delete item.eventTime;
                delete item.firstSentTime;
                delete item.originalEventTime;
            });
            chai_1.expect(JSON.parse(JSON.stringify(items))).to.deep.equal([{
                    priority: 999999,
                    receiveCount: 1,
                    data: {},
                    MessageBody: '123',
                    MessageAttribute: {},
                    MessageSystemAttribute: {},
                    state: 'FAILURE',
                    maxReceiveCount: 3,
                    queueARN: 'arn:sqns:sqs:sqns:1:queue1',
                    failureResponse: 'Event marked failed without response.',
                    processingResponse: 'sent to slave',
                    DeliveryPolicy: {
                        numRetries: 3,
                        numNoDelayRetries: 0,
                        minDelayTarget: 20,
                        maxDelayTarget: 20,
                        numMinDelayRetries: 0,
                        numMaxDelayRetries: 0,
                        backoffFunction: 'exponential',
                    },
                }]);
        });
        afterEach(() => slaveScheduler === null || slaveScheduler === void 0 ? void 0 : slaveScheduler.cancel());
    });
    context('error handling of mark event success or failure api', () => {
        beforeEach(async () => setup_1.dropDatabase());
        it('should give error when uri is not present mongoDBAdapter', async () => {
            try {
                const adapter = new mongo_d_b_adapter_1.MongoDBAdapter({ uri: undefined });
                await Promise.reject({ code: 99, message: 'should not reach here', adapter });
            }
            catch (error) {
                chai_1.expect(error.message).to.deep.equal('Database URI is missing');
            }
        });
        it('should give signature miss-match error when client credential are wrong', async () => {
            try {
                const client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: 'wrongAccessKey',
                    secretAccessKey: 'wrongSecret',
                });
                await client.markEventFailure('eventId', `${test_env_1.Env.URL}/api/sqs/sqns/1/queue1`, 'failureMessage');
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
        it('should give error when endpoint is wrong', async () => {
            try {
                const client = new s_q_n_s_client_1.SQNSClient({
                    endpoint: `${test_env_1.Env.URL}/api/wrong`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                });
                await client.markEventSuccess('eventId', `${test_env_1.Env.URL}/api/wrong/sqs/queue/queue1`, 'failureMessage');
                await Promise.reject({ code: 99, message: 'should not reach here.' });
            }
            catch (error) {
                const { code, message } = error;
                chai_1.expect({ code, message }).to.deep.equal({
                    code: '404',
                    message: '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Error</title>\n</head>\n'
                        + '<body>\n<pre>Cannot POST /api/wrong/sqs/queue/queue1/event/eventId/success</pre>\n</body>\n</html>\n',
                });
            }
        });
    });
});
//# sourceMappingURL=mongo-d-b-test.spec.js.map