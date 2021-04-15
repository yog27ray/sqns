"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const setup_1 = require("../../../setup");
const test_env_1 = require("../../../test-env");
const request_client_1 = require("../../common/request-client/request-client");
const manager_event_scheduler_1 = require("./manager-event-scheduler");
describe('ManagerEventSchedulerSpec', () => {
    context('installing a manager scheduler', () => {
        let masterScheduler;
        beforeEach(async () => setup_1.dropDatabase());
        it('should add job events in the queue', async () => {
            await new Promise((resolve) => {
                masterScheduler = new manager_event_scheduler_1.ManagerEventScheduler({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                }, { queue1: { page: 0 } }, async (queueName, { page }) => {
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
            const stats = await new request_client_1.RequestClient().get(`${test_env_1.Env.URL}/api/queues/events/stats`, true);
            chai_1.expect(stats).to.deep.equal({
                PRIORITY_TOTAL: 2,
                'arn:sqns:sqs:sqns:1:queue1': { PRIORITY_TOTAL: 2, PRIORITY_999999: 2 },
                PRIORITY_999999: 2,
            });
        });
        it('should add job events in the queue when base params is function', async () => {
            await new Promise((resolve) => {
                masterScheduler = new manager_event_scheduler_1.ManagerEventScheduler({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                }, { queue1: () => ({ page: 0 }) }, async (queueName, { page }) => {
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
            const stats = await new request_client_1.RequestClient().get(`${test_env_1.Env.URL}/api/queues/events/stats`, true);
            chai_1.expect(stats).to.deep.equal({
                PRIORITY_TOTAL: 2,
                'arn:sqns:sqs:sqns:1:queue1': { PRIORITY_TOTAL: 2, PRIORITY_999999: 2 },
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
        beforeEach(async () => setup_1.dropDatabase());
        it('should re-attempt to check if server is ready.', async () => {
            await new Promise((resolve) => {
                let maxAttemptCount = 2;
                masterScheduler = new manager_event_scheduler_1.ManagerEventScheduler({
                    endpoint: `${test_env_1.Env.URL}/api/wrong`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                }, { queue1: { page: 0 } }, async (queueName, { page }) => {
                    if (!maxAttemptCount) {
                        resolve();
                    }
                    maxAttemptCount -= 1;
                    return [{ page: page + 1 }, [{ MessageBody: 'type1' }]];
                }, '*/2 * * * * *');
            });
            const stats = await new request_client_1.RequestClient().get(`${test_env_1.Env.URL}/api/queues/events/stats`, true);
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