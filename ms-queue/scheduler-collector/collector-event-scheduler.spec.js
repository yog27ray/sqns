"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const request_promise_1 = __importDefault(require("request-promise"));
const event_manager_1 = require("../event-manager");
const test_env_1 = require("../test-env");
const collector_event_scheduler_1 = require("./collector-event-scheduler");
describe('CollectorEventSchedulerSpec', () => {
    context('installing a collector scheduler', () => {
        let masterScheduler;
        beforeEach(async () => {
            await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queues/reset`,
                body: { id: '123', type: 'type1' },
                json: true,
            });
        });
        it('should add job events in the queue', async () => {
            await new Promise((resolve) => {
                masterScheduler = new collector_event_scheduler_1.CollectorEventScheduler(`${test_env_1.Env.URL}/api`, 'queue1', { page: 0 }, async ({ page }) => {
                    const result = [];
                    if (!page) {
                        result.push(new event_manager_1.EventItem({ type: 'type1', id: '123' }));
                    }
                    else if (page === 1) {
                        result.push(new event_manager_1.EventItem({ type: 'type1', id: '1234' }));
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
        it('should add job events in the queue when base params is function', async () => {
            await new Promise((resolve) => {
                masterScheduler = new collector_event_scheduler_1.CollectorEventScheduler(`${test_env_1.Env.URL}/api`, 'queue1', () => ({ page: 0 }), async ({ page }) => {
                    const result = [];
                    if (!page) {
                        result.push(new event_manager_1.EventItem({ type: 'type1', id: '123' }));
                    }
                    else if (page === 1) {
                        result.push(new event_manager_1.EventItem({ type: 'type1', id: '1234' }));
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
            await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queues/reset`,
                body: { id: '123', type: 'type1' },
                json: true,
            });
        });
        it('should re-attempt to check if server is ready.', async () => {
            await new Promise((resolve) => {
                let maxAttemptCount = 2;
                masterScheduler = new collector_event_scheduler_1.CollectorEventScheduler(`${test_env_1.Env.URL}1/api`, 'queue1', { page: 0 }, async ({ page }) => {
                    if (!maxAttemptCount) {
                        resolve();
                    }
                    maxAttemptCount -= 1;
                    return [{ page: page + 1 }, [new event_manager_1.EventItem({ type: 'type1', id: '123' })]];
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
//# sourceMappingURL=collector-event-scheduler.spec.js.map