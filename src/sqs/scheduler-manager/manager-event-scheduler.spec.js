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
const manager_event_scheduler_1 = require("./manager-event-scheduler");
describe('CollectorEventSchedulerSpec', () => {
    context('installing a collector scheduler', () => {
        let masterScheduler;
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
            masterScheduler = new manager_event_scheduler_1.ManagerEventScheduler({}, 'queue1', { page: 0 }, async () => [{ page: 1 }, []]);
            masterScheduler.cancel();
        });
        it('should add job events in the queue', async () => {
            await new Promise((resolve) => {
                masterScheduler = new manager_event_scheduler_1.ManagerEventScheduler({
                    region: test_env_1.Env.region,
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                    maxRetries: 0,
                }, 'queue1', { page: 0 }, async ({ page }) => {
                    const results = [];
                    if (!page) {
                        results.push({ MessageBody: '123' });
                    }
                    else if (page === 1) {
                        results.push({ MessageBody: '1234' });
                    }
                    else if (page === 2) {
                        resolve();
                    }
                    return [{ page: page + 1 }, results];
                }, '*/10 * * * * *');
            });
            const stats = await request_promise_1.default({ uri: `${test_env_1.Env.URL}/api/queues/events/stats`, json: true });
            chai_1.expect(stats).to.deep.equal({
                PRIORITY_TOTAL: 2,
                queue1: { PRIORITY_TOTAL: 2, PRIORITY_999999: 2 },
                PRIORITY_999999: 2,
            });
        });
        it('should add job events in the queue when base params is function', async () => {
            await new Promise((resolve) => {
                masterScheduler = new manager_event_scheduler_1.ManagerEventScheduler({
                    region: test_env_1.Env.region,
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                    maxRetries: 0,
                }, 'queue1', () => ({ page: 0 }), async ({ page }) => {
                    const result = [];
                    if (!page) {
                        result.push({ MessageBody: 'type1' });
                    }
                    else if (page === 1) {
                        result.push({ MessageBody: 'type1' });
                    }
                    else if (page === 2) {
                        resolve();
                    }
                    return [{ page: page + 1 }, result];
                }, '*/10 * * * * *');
            });
            const stats = await request_promise_1.default({ uri: `${test_env_1.Env.URL}/api/queues/events/stats`, json: true });
            chai_1.expect(stats).to.deep.equal({
                PRIORITY_TOTAL: 2,
                queue1: { PRIORITY_TOTAL: 2, PRIORITY_999999: 2 },
                PRIORITY_999999: 2,
            });
        });
        afterEach(async () => {
            if (masterScheduler) {
                masterScheduler.cancel();
            }
        });
    });
    context('error handling of master scheduler', () => {
        let masterScheduler;
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
        });
        it('should re-attempt to check if server is ready.', async () => {
            await new Promise((resolve) => {
                let maxAttemptCount = 2;
                masterScheduler = new manager_event_scheduler_1.ManagerEventScheduler({
                    region: test_env_1.Env.region,
                    endpoint: `${test_env_1.Env.URL}/api/wrong`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                    maxRetries: 0,
                }, 'queue1', { page: 0 }, async ({ page }) => {
                    if (!maxAttemptCount) {
                        resolve();
                    }
                    maxAttemptCount -= 1;
                    return [{ page: page + 1 }, [{ MessageBody: 'type1' }]];
                }, '*/2 * * * * *');
            });
            const stats = await request_promise_1.default({ uri: `${test_env_1.Env.URL}/api/queues/events/stats`, json: true });
            chai_1.expect(stats).to.deep.equal({ PRIORITY_TOTAL: 0 });
        });
        afterEach(async () => {
            if (masterScheduler) {
                masterScheduler.cancel();
            }
        });
    });
});
//# sourceMappingURL=manager-event-scheduler.spec.js.map