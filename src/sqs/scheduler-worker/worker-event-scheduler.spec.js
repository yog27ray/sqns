"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const request_promise_1 = __importDefault(require("request-promise"));
const setup_1 = require("../../setup");
const test_env_1 = require("../../test-env");
const aws_1 = require("../aws");
const worker_event_scheduler_1 = require("./worker-event-scheduler");
describe('SlaveEventSchedulerSpec', () => {
    context('installing a slave scheduler', () => {
        let slaveScheduler;
        beforeEach(async () => {
            await setup_1.dropDatabase();
            const client = new aws_1.SimpleQueueServerClient({
                region: test_env_1.Env.region,
                endpoint: `${test_env_1.Env.URL}/api`,
                accessKeyId: test_env_1.Env.accessKeyId,
                secretAccessKey: test_env_1.Env.secretAccessKey,
                maxRetries: 0,
            });
            await test_env_1.deleteQueues(client);
            const queue = await client.createQueue({ QueueName: 'queue1' });
            await client.sendMessageBatch({
                QueueUrl: queue.QueueUrl,
                Entries: [{ Id: '123', MessageBody: 'type1' }, { Id: '1234', MessageBody: 'type2' }],
            });
        });
        it('should add job events in the queue', async () => {
            const result = [];
            await new Promise((resolve) => {
                let itemCheck = 2;
                slaveScheduler = new worker_event_scheduler_1.WorkerEventScheduler({
                    region: test_env_1.Env.region,
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                    maxRetries: 0,
                }, 'queue1', async (item) => {
                    result.push(item);
                    itemCheck -= 1;
                    if (!itemCheck) {
                        resolve();
                    }
                    return 'response';
                }, '*/2 * * * * *');
            });
            const stats = await request_promise_1.default({ uri: `${test_env_1.Env.URL}/api/queues/events/stats`, json: true });
            chai_1.expect(stats).to.deep.equal({
                PRIORITY_TOTAL: 0,
                PRIORITY_999999: 0,
                queue1: { PRIORITY_TOTAL: 0, PRIORITY_999999: 0 },
            });
            test_env_1.deleteDynamicDataOfResults({ Messages: result });
            chai_1.expect(result).to.deep.equal([
                { MD5OfBody: '3156e42ab24604b8de92a93ed761532d', Body: 'type1' },
                { MD5OfBody: '8fe8b170aa076a4233d8eda7d28804d4', Body: 'type2' },
            ]);
        });
        afterEach(async () => {
            slaveScheduler.cancel();
        });
    });
    context('processing multiple events', () => {
        let slaveScheduler;
        const ITEM_COUNT = 100;
        beforeEach(async () => {
            await setup_1.dropDatabase();
            const client = new aws_1.SimpleQueueServerClient({
                region: test_env_1.Env.region,
                endpoint: `${test_env_1.Env.URL}/api`,
                accessKeyId: test_env_1.Env.accessKeyId,
                secretAccessKey: test_env_1.Env.secretAccessKey,
                maxRetries: 0,
            });
            await test_env_1.deleteQueues(client);
            const queue = await client.createQueue({ QueueName: 'queue1' });
            await client.sendMessageBatch({
                QueueUrl: queue.QueueUrl,
                Entries: new Array(ITEM_COUNT).fill(0).map((v, id) => ({ Id: `${id}`, MessageBody: 'type1' })),
            });
            await setup_1.delay();
        });
        it('should process 100 events in the queue', async () => {
            await new Promise((resolve) => {
                let itemCheck = ITEM_COUNT;
                slaveScheduler = new worker_event_scheduler_1.WorkerEventScheduler({
                    region: test_env_1.Env.region,
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                    maxRetries: 0,
                }, 'queue1', 
                // eslint-disable-next-line promise/param-names
                () => new Promise((resolve1) => setTimeout(() => {
                    resolve1();
                    itemCheck -= 1;
                    if (!itemCheck) {
                        resolve();
                    }
                }, 10)), '*/2 * * * * *');
            });
            await setup_1.delay();
            const stats = await request_promise_1.default({ uri: `${test_env_1.Env.URL}/api/queues/events/stats`, json: true });
            chai_1.expect(stats).to.deep.equal({
                PRIORITY_TOTAL: 0,
                PRIORITY_999999: 0,
                queue1: { PRIORITY_TOTAL: 0, PRIORITY_999999: 0 },
            });
        });
        afterEach(async () => {
            slaveScheduler.cancel();
        });
    });
    context('error handling of slave scheduler', () => {
        let slaveScheduler;
        beforeEach(async () => {
            await setup_1.dropDatabase();
            const client = new aws_1.SimpleQueueServerClient({
                region: test_env_1.Env.region,
                endpoint: `${test_env_1.Env.URL}/api`,
                accessKeyId: test_env_1.Env.accessKeyId,
                secretAccessKey: test_env_1.Env.secretAccessKey,
                maxRetries: 0,
            });
            await test_env_1.deleteQueues(client);
            const queue = await client.createQueue({ QueueName: 'queue1' });
            await client.sendMessageBatch({
                QueueUrl: queue.QueueUrl,
                Entries: [{ Id: '123', MessageBody: 'type1' }, { Id: '1234', MessageBody: 'type2' }],
            });
            await setup_1.delay();
            slaveScheduler = new worker_event_scheduler_1.WorkerEventScheduler({}, 'queue1', () => Promise.resolve('this is success message'));
            slaveScheduler.cancel();
        });
        it('should re-attempt to check if server is ready.', async () => {
            await new Promise((resolve) => {
                const timeout = setTimeout(resolve, 6000);
                slaveScheduler = new worker_event_scheduler_1.WorkerEventScheduler({
                    region: test_env_1.Env.region,
                    endpoint: `${test_env_1.Env.URL}/api/wrong`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                    maxRetries: 0,
                }, 'queue1', async () => {
                    clearTimeout(timeout);
                    return 'response';
                }, '*/2 * * * * *');
            });
            const stats = await request_promise_1.default({ uri: `${test_env_1.Env.URL}/api/queues/events/stats`, json: true });
            chai_1.expect(stats).to.deep.equal({
                PRIORITY_TOTAL: 2,
                queue1: { PRIORITY_TOTAL: 2, PRIORITY_999999: 2 },
                PRIORITY_999999: 2,
            });
        });
        it('should call failure api when request fails.', async () => {
            await new Promise((resolve) => {
                let count = 0;
                slaveScheduler = new worker_event_scheduler_1.WorkerEventScheduler({
                    region: test_env_1.Env.region,
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                    maxRetries: 0,
                }, 'queue1', () => {
                    count += 1;
                    if (count === 2) {
                        setTimeout(resolve, 0);
                        return Promise.resolve('this is success message');
                    }
                    return Promise.reject('Error in processing');
                }, '*/2 * * * * *');
            });
            const stats = await request_promise_1.default({ uri: `${test_env_1.Env.URL}/api/queues/events/stats`, json: true });
            chai_1.expect(stats).to.deep.equal({
                PRIORITY_TOTAL: 0,
                queue1: { PRIORITY_TOTAL: 0, PRIORITY_999999: 0 },
                PRIORITY_999999: 0,
            });
        });
        afterEach(async () => {
            slaveScheduler.cancel();
        });
    });
});
//# sourceMappingURL=worker-event-scheduler.spec.js.map