"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const moment_1 = __importDefault(require("moment"));
const request_promise_1 = __importDefault(require("request-promise"));
const setup_1 = require("../../../setup");
const test_env_1 = require("../../../test-env");
const aws_1 = require("../../aws");
const worker_event_scheduler_1 = require("../../scheduler-worker/worker-event-scheduler");
const mongo_d_b_adapter_1 = require("./mongo-d-b-adapter");
if (process.env.TEST_DB === 'mongoDB') {
    describe('mongoDB test cases', () => {
        context('SlaveEventSchedulerSpec', () => {
            let slaveScheduler;
            let queue;
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
                queue = await client.createQueue({ QueueName: 'queue1' });
                const time = new Date().getTime() / -1000;
                await client.sendMessageBatch({
                    QueueUrl: queue.QueueUrl,
                    Entries: [
                        { Id: '123', MessageBody: '123', DelaySeconds: time },
                        { Id: '1234', MessageBody: '1234', DelaySeconds: time + 60 },
                        { Id: '1235', MessageBody: '1235', DelaySeconds: time + 120 },
                    ],
                });
            });
            it('should call failure api when request fails in mongoDB.', async () => {
                await new Promise((resolve) => {
                    let count = 0;
                    slaveScheduler = new worker_event_scheduler_1.WorkerEventScheduler({
                        region: test_env_1.Env.region,
                        endpoint: `${test_env_1.Env.URL}/api`,
                        accessKeyId: test_env_1.Env.accessKeyId,
                        secretAccessKey: test_env_1.Env.secretAccessKey,
                        maxRetries: 0,
                    }, 'queue1', async () => {
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
                const stats = await request_promise_1.default({ uri: `${test_env_1.Env.URL}/api/queues/events/stats`, json: true });
                chai_1.expect(stats).to.deep.equal({
                    PRIORITY_TOTAL: 0,
                    queue1: { PRIORITY_TOTAL: 0, PRIORITY_999999: 0 },
                    PRIORITY_999999: 0,
                });
                const queueItem = await setup_1.mongoConnection.findOne('_Queue_Queues', { name: 'queue1' });
                const items = await setup_1.mongoConnection.find('_Queue_Event', {}, { originalEventTime: 1 });
                chai_1.expect(moment_1.default(items[0].originalEventTime).utc().format('YYYY-MM-DDTHH:mm')).to.equal('1970-01-01T00:00');
                chai_1.expect(moment_1.default(items[1].originalEventTime).utc().format('YYYY-MM-DDTHH:mm')).to.equal('1970-01-01T00:01');
                chai_1.expect(moment_1.default(items[2].originalEventTime).utc().format('YYYY-MM-DDTHH:mm')).to.equal('1970-01-01T00:02');
                items.forEach((item_) => {
                    const item = item_;
                    chai_1.expect(item._id).to.exist;
                    chai_1.expect(item.createdAt).to.exist;
                    chai_1.expect(item.updatedAt).to.exist;
                    chai_1.expect(moment_1.default(item.eventTime).diff(moment_1.default(), 'seconds'), 'delay in event min time').to.be.at.least(29);
                    chai_1.expect(moment_1.default(item.eventTime).diff(moment_1.default(), 'seconds'), 'delay in event max time').to.be.at.most(30);
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
                        queueId: queueItem._id,
                        MessageSystemAttribute: {},
                        maxReceiveCount: 3,
                        data: {},
                        MessageBody: '123',
                        MessageAttribute: {},
                        state: 'FAILURE',
                        processingResponse: 'sent to slave',
                        failureResponse: 'Event marked failed without response.',
                    }, {
                        priority: 999999,
                        receiveCount: 1,
                        queueId: queueItem._id,
                        MessageSystemAttribute: {},
                        maxReceiveCount: 3,
                        data: {},
                        MessageBody: '1234',
                        MessageAttribute: {},
                        state: 'PROCESSING',
                        processingResponse: 'sent to slave',
                    }, {
                        priority: 999999,
                        receiveCount: 1,
                        queueId: queueItem._id,
                        MessageSystemAttribute: {},
                        maxReceiveCount: 3,
                        data: {},
                        MessageBody: '1235',
                        MessageAttribute: {},
                        state: 'SUCCESS',
                        processingResponse: 'sent to slave',
                        successResponse: 'this is success message',
                    }]);
            });
            afterEach(async () => {
                slaveScheduler.cancel();
            });
        });
        context('retry of failed events', () => {
            let slaveScheduler;
            let queue;
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
                        region: test_env_1.Env.region,
                        endpoint: `${test_env_1.Env.URL}/api`,
                        accessKeyId: test_env_1.Env.accessKeyId,
                        secretAccessKey: test_env_1.Env.secretAccessKey,
                        maxRetries: 0,
                    }, 'queue1', () => {
                        setTimeout(resolve, 0);
                        return Promise.reject('Error in processing');
                    }, '*/2 * * * * *');
                });
                await setup_1.delay();
                const stats = await request_promise_1.default({ uri: `${test_env_1.Env.URL}/api/queues/events/stats`, json: true });
                chai_1.expect(stats).to.deep.equal({
                    PRIORITY_TOTAL: 0,
                    queue1: { PRIORITY_TOTAL: 0, PRIORITY_999999: 0 },
                    PRIORITY_999999: 0,
                });
                const queueItem = await setup_1.mongoConnection.findOne('_Queue_Queues', { name: 'queue1' });
                const items = await setup_1.mongoConnection.find('_Queue_Event', {}, { eventTime: -1 });
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
                        queueId: queueItem._id,
                        data: {},
                        MessageBody: '123',
                        MessageAttribute: {},
                        MessageSystemAttribute: {},
                        state: 'FAILURE',
                        maxReceiveCount: 3,
                        failureResponse: 'Event marked failed without response.',
                        processingResponse: 'sent to slave',
                    }]);
            });
            afterEach(async () => {
                slaveScheduler.cancel();
            });
        });
        context('error handling of mark event success or failure api', () => {
            beforeEach(async () => {
                await setup_1.dropDatabase();
            });
            it('should give error when uri is not present mongoDBAdapter', async () => {
                try {
                    const x = new mongo_d_b_adapter_1.MongoDBAdapter({});
                    await Promise.reject({ code: 99, message: 'should not reach here' });
                }
                catch (error) {
                    chai_1.expect(error.message).to.deep.equal('Database URI is missing');
                }
            });
            it('should give signature miss-match error when client credential are wrong', async () => {
                try {
                    const client = new aws_1.SimpleQueueServerClient({
                        region: test_env_1.Env.region,
                        endpoint: `${test_env_1.Env.URL}/api`,
                        accessKeyId: 'wrongAccessKey',
                        secretAccessKey: 'wrongSecret',
                        maxRetries: 0,
                    });
                    await client.markEventFailure('eventId', `${test_env_1.Env.URL}/api/sqs/queue/queue1`, 'failureMessage');
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
                    const client = new aws_1.SimpleQueueServerClient({
                        region: test_env_1.Env.region,
                        endpoint: `${test_env_1.Env.URL}/api/wrong`,
                        accessKeyId: test_env_1.Env.accessKeyId,
                        secretAccessKey: test_env_1.Env.secretAccessKey,
                        maxRetries: 0,
                    });
                    await client.markEventSuccess('eventId', `${test_env_1.Env.URL}/api/wrong/sqs/queue/queue1`, 'failureMessage');
                    await Promise.reject({ code: 99, message: 'should not reach here.' });
                }
                catch (error) {
                    const { code, message } = error;
                    chai_1.expect({ code, message }).to.deep.equal({
                        code: 404,
                        message: '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Error</title>\n</head>\n'
                            + '<body>\n<pre>Cannot POST /api/wrong/sqs/queue/queue1/event/eventId/success</pre>\n</body>\n</html>\n',
                    });
                }
            });
        });
    });
}
//# sourceMappingURL=mongo-d-b-test.spec.js.map