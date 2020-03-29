"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const request_promise_1 = __importDefault(require("request-promise"));
const test_env_1 = require("../test-env");
const processing_event_scheduler_1 = require("./processing-event-scheduler");
describe('SlaveEventSchedulerSpec', () => {
    context('installing a slave scheduler', () => {
        let slaveScheduler;
        beforeEach(async () => {
            await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queues/reset`,
                json: true,
            });
            await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queue/queue1/event/bulk/new`,
                body: [{ id: '123', type: 'type1' }, { id: '1234', type: 'type2' }],
                json: true,
            });
        });
        it('should add job events in the queue', async () => {
            const result = [];
            await new Promise((resolve) => {
                let itemCheck = 2;
                slaveScheduler = new processing_event_scheduler_1.ProcessingEventScheduler(`${test_env_1.Env.URL}/api`, 'queue1', async (item) => {
                    result.push(item);
                    itemCheck -= 1;
                    if (!itemCheck) {
                        resolve();
                    }
                }, '*/2 * * * * *');
            });
            const stats = await request_promise_1.default({ uri: `${test_env_1.Env.URL}/api/queues/events/stats`, json: true });
            chai_1.expect(stats).to.deep.equal({ PRIORITY_TOTAL: 0 });
            chai_1.expect(result.map((each) => each.toRequestBody())).to.deep.equal([
                { id: '123', priority: 999999, type: 'type1', data: {} },
                { id: '1234', priority: 999999, type: 'type2', data: {} },
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
            await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queues/reset`,
                json: true,
            });
            await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queue/queue1/event/bulk/new`,
                body: new Array(ITEM_COUNT).fill(0).map((v, id) => ({ id: `${id}`, type: 'type1' })),
                json: true,
            });
        });
        it('should process 100 events in the queue', async () => {
            await new Promise((resolve, reject) => {
                let itemCheck = ITEM_COUNT;
                slaveScheduler = new processing_event_scheduler_1.ProcessingEventScheduler(`${test_env_1.Env.URL}/api`, 'queue1', 
                // eslint-disable-next-line promise/param-names
                () => new Promise((resolve1) => setTimeout(() => {
                    resolve1();
                    itemCheck -= 1;
                    if (!itemCheck) {
                        resolve();
                    }
                }, 100)), '*/2 * * * * *');
            });
            const stats = await request_promise_1.default({ uri: `${test_env_1.Env.URL}/api/queues/events/stats`, json: true });
            chai_1.expect(stats).to.deep.equal({ PRIORITY_TOTAL: 0 });
        });
        afterEach(async () => {
            slaveScheduler.cancel();
        });
    });
    context('error handling of slave scheduler', () => {
        let slaveScheduler;
        beforeEach(async () => {
            await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queues/reset`,
                body: { id: '123', type: 'type1' },
                json: true,
            });
            await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queue/queue1/event/bulk/new`,
                body: [{ id: '123', type: 'type1' }, { id: '1234', type: 'type2' }],
                json: true,
            });
        });
        it('should re-attempt to check if server is ready.', async () => {
            await new Promise((resolve) => {
                const timeout = setTimeout(resolve, 6000);
                slaveScheduler = new processing_event_scheduler_1.ProcessingEventScheduler(`${test_env_1.Env.URL}1/api`, 'queue1', async () => {
                    clearTimeout(timeout);
                }, '*/2 * * * * *');
            });
            const stats = await request_promise_1.default({ uri: `${test_env_1.Env.URL}/api/queues/events/stats`, json: true });
            chai_1.expect(stats).to.deep.equal({
                PRIORITY_TOTAL: 2,
                queue1: { PRIORITY_TOTAL: 2, PRIORITY_999999: 2 },
                PRIORITY_999999: 2,
            });
        });
        afterEach(async () => {
            slaveScheduler.cancel();
        });
    });
});
//# sourceMappingURL=processing-event-scheduler.spec.js.map