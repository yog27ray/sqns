"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const request_promise_1 = __importDefault(require("request-promise"));
const test_env_1 = require("../../test-env");
describe('EventManagerMasterSpec', () => {
    context('eventBulkNew', () => {
        before(async () => {
            await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queues/reset`,
                body: { id: '123', type: 'type1' },
                json: true,
            });
        });
        it('should give error when type is not present in any one item', async () => {
            try {
                await request_promise_1.default({
                    method: 'POST',
                    uri: `${test_env_1.Env.URL}/api/queue/queue1/event/bulk/new`,
                    body: [{ id: '123', type: 'type1' }, {}],
                    json: true,
                });
                await Promise.reject({ code: 99, message: 'should not reach here' });
            }
            catch (error) {
                chai_1.expect(error.message).to.equal('400 - "Event type is missing for some items"');
            }
        });
        it('should add new events in the queue1', async () => {
            const result = await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queue/queue1/event/bulk/new`,
                body: [{ id: '123', type: 'type1' }, { id: '1234', type: 'type2' }],
                json: true,
            });
            chai_1.expect(result).to.deep.equal([
                { id: '123', priority: 999999, type: 'type1' },
                { id: '1234', priority: 999999, type: 'type2' },
            ]);
        });
    });
    context('eventNew', () => {
        before(async () => {
            await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queues/reset`,
                body: { id: '123', type: 'type1' },
                json: true,
            });
        });
        it('should give error when type is not present', async () => {
            try {
                await request_promise_1.default({
                    method: 'POST',
                    uri: `${test_env_1.Env.URL}/api/queue/queue1/event/new`,
                    body: {},
                    json: true,
                });
                await Promise.reject({ code: 99, message: 'should not reach here' });
            }
            catch (error) {
                chai_1.expect(error.message).to.equal('400 - "Event type is missing"');
            }
        });
        it('should add new event in the queue1', async () => {
            const result = await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queue/queue1/event/new`,
                body: { id: '123', type: 'type1' },
                json: true,
            });
            chai_1.expect(result).to.deep.equal({
                id: '123',
                priority: 999999,
                type: 'type1',
            });
        });
        it('should not add same event twice in queue1', async () => {
            await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queue/queue1/event/new`,
                body: { id: '123', type: 'type1' },
                json: true,
            });
            const result = await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queue/queue1/event/new`,
                body: { id: '123', type: 'type1' },
                json: true,
            });
            chai_1.expect(result).to.deep.equal({
                id: '123',
                priority: 999999,
                type: 'type1',
            });
            const stats = await request_promise_1.default({ uri: `${test_env_1.Env.URL}/api/queues/events/stats`, json: true });
            chai_1.expect(stats).to.deep.equal({
                PRIORITY_TOTAL: 1,
                queue1: { PRIORITY_TOTAL: 1, PRIORITY_999999: 1 },
                PRIORITY_999999: 1,
            });
        });
    });
    context('reset', () => {
        beforeEach(async () => {
            await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queue/reset1/event/new`,
                body: { id: '123', type: 'type1' },
                json: true,
            });
            await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queue/reset2/event/new`,
                body: { id: '123', type: 'type1' },
                json: true,
            });
        });
        it('should reset all queues', async () => {
            await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queues/reset`,
                body: { id: '123', type: 'type1' },
                json: true,
            });
            const stats = await request_promise_1.default({ uri: `${test_env_1.Env.URL}/api/queues/events/stats`, json: true });
            chai_1.expect(stats).to.deep.equal({ PRIORITY_TOTAL: 0 });
        });
        it('should reset only queue 1', async () => {
            await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queue/reset1/reset`,
                body: { id: '123', type: 'type1' },
                json: true,
            });
            const stats = await request_promise_1.default({ uri: `${test_env_1.Env.URL}/api/queues/events/stats`, json: true });
            chai_1.expect(stats).to.deep.equal({
                PRIORITY_TOTAL: 1,
                reset2: { PRIORITY_TOTAL: 1, PRIORITY_999999: 1 },
                PRIORITY_999999: 1,
            });
        });
    });
    context('eventStats', () => {
        before(async () => {
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
            await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queue/queue2/event/bulk/new`,
                body: [{ id: '123', type: 'type1' }, { id: '1234', type: 'type2' }, { id: '1224', type: 'type2', priority: 1 }],
                json: true,
            });
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
            chai_1.expect(statsWithoutTimeStamp).to.deep.equal('queue_priority{label="PRIORITY_TOTAL"} 5\n'
                + 'queue_priority{label="PRIORITY_999999"} 4\n'
                + 'queue_priority{label="PRIORITY_1"} 1\n'
                + 'queue1_queue_priority{label="PRIORITY_TOTAL"} 5\n'
                + 'queue1_queue_priority{label="PRIORITY_999999"} 4\n'
                + 'queue1_queue_priority{label="PRIORITY_1"} 1\n'
                + 'queue2_queue_priority{label="PRIORITY_TOTAL"} 5\n'
                + 'queue2_queue_priority{label="PRIORITY_999999"} 4\n'
                + 'queue2_queue_priority{label="PRIORITY_1"} 1\n');
        });
    });
    context('eventPoll', () => {
        beforeEach(async () => {
            await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queues/reset`,
                body: {},
                json: true,
            });
            await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queue/queue2/event/bulk/new`,
                body: [{ id: '123', type: 'type1' }, { id: '1224', type: 'type2', priority: 1 }, { id: '123', type: 'type1' }],
                json: true,
            });
        });
        it('should return highest priority item', async () => {
            const event = await request_promise_1.default({
                uri: `${test_env_1.Env.URL}/api/queue/queue2/event/poll`,
                json: true,
            });
            chai_1.expect(event.length).to.equal(1);
            delete event[0].createdAt;
            chai_1.expect(event).to.deep.equal([{
                    id: '1224',
                    type: 'type2',
                    data: {},
                    priority: 1,
                }]);
        });
        it('should return empty error when no event to process.', async () => {
            await request_promise_1.default({
                uri: `${test_env_1.Env.URL}/api/queue/queue2/event/poll`,
                json: true,
            });
            await request_promise_1.default({
                uri: `${test_env_1.Env.URL}/api/queue/queue2/event/poll`,
                json: true,
            });
            await request_promise_1.default({
                uri: `${test_env_1.Env.URL}/api/queue/queue2/event/poll`,
                json: true,
            });
            const event = await request_promise_1.default({
                uri: `${test_env_1.Env.URL}/api/queue/queue2/event/poll`,
                json: true,
            });
            chai_1.expect(event.length).to.equal(0);
        });
    });
});
//# sourceMappingURL=event-manager-master.spec.js.map