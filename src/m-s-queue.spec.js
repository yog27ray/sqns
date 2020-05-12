"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const request_promise_1 = __importDefault(require("request-promise"));
const index_1 = require("../index");
const setup_1 = require("./setup");
const test_env_1 = require("./test-env");
describe('MSQueue', () => {
    context('Processing of msQueue with comparator function in ascending order', () => {
        before(async () => {
            await setup_1.mongoConnection.dropDatabase();
            setup_1.mSQueue.queueComparator('queue1', (item1, item2) => (item1.priority > item2.priority));
            await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queue/queue1/event/bulk/new`,
                body: [
                    { id: '1231', type: 'type1', priority: 100 },
                    { id: '1232', type: 'type2', priority: 10 },
                    { id: '1233', type: 'type2', priority: 40 },
                    { id: '1234', type: 'type2', priority: 20 },
                    { id: '1235', type: 'type2', priority: 30 },
                    { id: '1236', type: 'type2', priority: 1 },
                ],
                json: true,
            });
        });
        it('should process event in ascending item', async () => {
            const mSQueueRequestHandler = new index_1.MSQueueRequestHandler();
            let event = await mSQueueRequestHandler.fetchEventsFromQueue(`${test_env_1.Env.URL}/api`, 'queue1');
            chai_1.expect(event.priority).to.equal(100);
            event = await mSQueueRequestHandler.fetchEventsFromQueue(`${test_env_1.Env.URL}/api`, 'queue1');
            chai_1.expect(event.priority).to.equal(40);
            event = await mSQueueRequestHandler.fetchEventsFromQueue(`${test_env_1.Env.URL}/api`, 'queue1');
            chai_1.expect(event.priority).to.equal(30);
            event = await mSQueueRequestHandler.fetchEventsFromQueue(`${test_env_1.Env.URL}/api`, 'queue1');
            chai_1.expect(event.priority).to.equal(20);
            event = await mSQueueRequestHandler.fetchEventsFromQueue(`${test_env_1.Env.URL}/api`, 'queue1');
            chai_1.expect(event.priority).to.equal(10);
            event = await mSQueueRequestHandler.fetchEventsFromQueue(`${test_env_1.Env.URL}/api`, 'queue1');
            chai_1.expect(event.priority).to.equal(1);
            event = await mSQueueRequestHandler.fetchEventsFromQueue(`${test_env_1.Env.URL}/api`, 'queue1');
            chai_1.expect(event).to.not.exist;
        });
        after(() => {
            setup_1.mSQueue.queueComparator('queue1', undefined);
        });
    });
    context('Processing of msQueue with comparator function in descending order', () => {
        before(async () => {
            await setup_1.mongoConnection.dropDatabase();
            setup_1.mSQueue.queueComparator('queue1', (item1, item2) => (item1.priority < item2.priority));
            await request_promise_1.default({
                method: 'POST',
                uri: `${test_env_1.Env.URL}/api/queue/queue1/event/bulk/new`,
                body: [
                    { id: '1231', type: 'type1', priority: 100 },
                    { id: '1232', type: 'type2', priority: 10 },
                    { id: '1233', type: 'type2', priority: 40 },
                    { id: '1234', type: 'type2', priority: 20 },
                    { id: '1235', type: 'type2', priority: 30 },
                    { id: '1236', type: 'type2', priority: 1 },
                ],
                json: true,
            });
        });
        it('should process event in ascending item', async () => {
            const mSQueueRequestHandler = new index_1.MSQueueRequestHandler();
            let event = await mSQueueRequestHandler.fetchEventsFromQueue(`${test_env_1.Env.URL}/api`, 'queue1');
            chai_1.expect(event.priority).to.equal(1);
            event = await mSQueueRequestHandler.fetchEventsFromQueue(`${test_env_1.Env.URL}/api`, 'queue1');
            chai_1.expect(event.priority).to.equal(10);
            event = await mSQueueRequestHandler.fetchEventsFromQueue(`${test_env_1.Env.URL}/api`, 'queue1');
            chai_1.expect(event.priority).to.equal(20);
            event = await mSQueueRequestHandler.fetchEventsFromQueue(`${test_env_1.Env.URL}/api`, 'queue1');
            chai_1.expect(event.priority).to.equal(30);
            event = await mSQueueRequestHandler.fetchEventsFromQueue(`${test_env_1.Env.URL}/api`, 'queue1');
            chai_1.expect(event.priority).to.equal(40);
            event = await mSQueueRequestHandler.fetchEventsFromQueue(`${test_env_1.Env.URL}/api`, 'queue1');
            chai_1.expect(event.priority).to.equal(100);
            event = await mSQueueRequestHandler.fetchEventsFromQueue(`${test_env_1.Env.URL}/api`, 'queue1');
            chai_1.expect(event).to.not.exist;
        });
        after(() => {
            setup_1.mSQueue.queueComparator('queue1', undefined);
        });
    });
});
//# sourceMappingURL=m-s-queue.spec.js.map