"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const nock_1 = __importDefault(require("nock"));
const setup_1 = require("../../../setup");
const test_env_1 = require("../../../test-env");
const common_1 = require("../../common/helper/common");
const request_client_1 = require("../../common/request-client/request-client");
const s_q_n_s_client_1 = require("../../s-q-n-s-client");
const worker_event_scheduler_1 = require("./worker-event-scheduler");
describe('WorkerEventSchedulerSpec', () => {
    context('installing a Worker scheduler', () => {
        let workerEventScheduler;
        beforeEach(async () => {
            await setup_1.dropDatabase();
            const client = new s_q_n_s_client_1.SQNSClient({
                endpoint: `${test_env_1.Env.URL}/api`,
                accessKeyId: test_env_1.Env.accessKeyId,
                secretAccessKey: test_env_1.Env.secretAccessKey,
            });
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
                workerEventScheduler = new worker_event_scheduler_1.WorkerEventScheduler({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                }, ['queue1'], async (queueName, item) => {
                    result.push(item);
                    itemCheck -= 1;
                    if (!itemCheck) {
                        resolve();
                    }
                    return 'response';
                }, '*/2 * * * * *');
            });
            const stats = await new request_client_1.RequestClient().get(`${test_env_1.Env.URL}/api/queues/events/stats`, true);
            chai_1.expect(stats).to.deep.equal({
                PRIORITY_TOTAL: 0,
                PRIORITY_999999: 0,
                'arn:sqns:sqs:sqns:1:queue1': { PRIORITY_TOTAL: 0, PRIORITY_999999: 0 },
            });
            test_env_1.deleteDynamicDataOfResults({ Messages: result });
            chai_1.expect(result).to.deep.equal([
                { MD5OfBody: '3156e42ab24604b8de92a93ed761532d', Body: 'type1' },
                { MD5OfBody: '8fe8b170aa076a4233d8eda7d28804d4', Body: 'type2' },
            ]);
        });
        afterEach(async () => {
            workerEventScheduler.cancel();
        });
    });
    context('processing multiple events', () => {
        let workerEventScheduler;
        const ITEM_COUNT = 100;
        beforeEach(async () => {
            await setup_1.dropDatabase();
            const client = new s_q_n_s_client_1.SQNSClient({
                endpoint: `${test_env_1.Env.URL}/api`,
                accessKeyId: test_env_1.Env.accessKeyId,
                secretAccessKey: test_env_1.Env.secretAccessKey,
            });
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
                workerEventScheduler = new worker_event_scheduler_1.WorkerEventScheduler({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                }, ['queue1'], 
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
            const stats = await new request_client_1.RequestClient().get(`${test_env_1.Env.URL}/api/queues/events/stats`, true);
            chai_1.expect(stats).to.deep.equal({
                PRIORITY_TOTAL: 0,
                PRIORITY_999999: 0,
                'arn:sqns:sqs:sqns:1:queue1': { PRIORITY_TOTAL: 0, PRIORITY_999999: 0 },
            });
        });
        afterEach(async () => {
            workerEventScheduler.cancel();
        });
    });
    context('error handling of slave scheduler', () => {
        let workerEventScheduler;
        beforeEach(async () => {
            await setup_1.dropDatabase();
            const client = new s_q_n_s_client_1.SQNSClient({
                endpoint: `${test_env_1.Env.URL}/api`,
                accessKeyId: test_env_1.Env.accessKeyId,
                secretAccessKey: test_env_1.Env.secretAccessKey,
            });
            const queue = await client.createQueue({ QueueName: 'queue1' });
            await client.sendMessageBatch({
                QueueUrl: queue.QueueUrl,
                Entries: [{ Id: '123', MessageBody: 'type1' }, { Id: '1234', MessageBody: 'type2' }],
            });
            await setup_1.delay();
        });
        it('should re-attempt to check if server is ready.', async () => {
            await new Promise((resolve) => {
                const timeout = setTimeout(resolve, 6000);
                workerEventScheduler = new worker_event_scheduler_1.WorkerEventScheduler({
                    endpoint: `${test_env_1.Env.URL}/api/wrong`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                }, ['queue1'], async () => {
                    clearTimeout(timeout);
                    return 'response';
                }, '*/2 * * * * *');
            });
            const stats = await new request_client_1.RequestClient().get(`${test_env_1.Env.URL}/api/queues/events/stats`, true);
            chai_1.expect(stats).to.deep.equal({
                PRIORITY_TOTAL: 2,
                'arn:sqns:sqs:sqns:1:queue1': { PRIORITY_TOTAL: 2, PRIORITY_999999: 2 },
                PRIORITY_999999: 2,
            });
        });
        it('should call failure api when request fails.', async () => {
            await new Promise((resolve) => {
                let count = 0;
                workerEventScheduler = new worker_event_scheduler_1.WorkerEventScheduler({
                    endpoint: `${test_env_1.Env.URL}/api`,
                    accessKeyId: test_env_1.Env.accessKeyId,
                    secretAccessKey: test_env_1.Env.secretAccessKey,
                }, ['queue1'], () => {
                    count += 1;
                    if (count === 2) {
                        setTimeout(resolve, 0);
                        return Promise.resolve('this is success message');
                    }
                    return Promise.reject('Error in processing');
                }, '*/2 * * * * *');
            });
            const stats = await new request_client_1.RequestClient().get(`${test_env_1.Env.URL}/api/queues/events/stats`, true);
            chai_1.expect(stats).to.deep.equal({
                PRIORITY_TOTAL: 0,
                'arn:sqns:sqs:sqns:1:queue1': { PRIORITY_TOTAL: 0, PRIORITY_999999: 0 },
                PRIORITY_999999: 0,
            });
        });
        afterEach(async () => {
            workerEventScheduler.cancel();
        });
    });
    context('processing of sns scheduler', () => {
        let workerEventScheduler;
        let interval;
        let client;
        let PublishId;
        let SubscriptionArn;
        let topic;
        beforeEach(async () => {
            await setup_1.dropDatabase();
            client = new s_q_n_s_client_1.SQNSClient({
                endpoint: `${test_env_1.Env.URL}/api`,
                accessKeyId: test_env_1.Env.accessKeyId,
                secretAccessKey: test_env_1.Env.secretAccessKey,
            });
            topic = await client.createTopic({
                Name: 'Topic1',
                Attributes: {
                    DeliveryPolicy: '{"default":{"defaultHealthyRetryPolicy":'
                        + '{"numRetries":1,"numNoDelayRetries":2,"minDelayTarget":3,"maxDelayTarget":4,"numMinDelayRetries":5,"numMaxDelayRetries":6,'
                        + '"backoffFunction":"linear"},"disableOverrides":false}}',
                },
            });
        });
        it('should update published events as completed when no subscription to topic exists', async () => {
            const { MessageId: PublishId } = await client.publish({
                Message: 'This is message',
                TopicArn: topic.TopicArn,
                PhoneNumber: '9999999999',
                Subject: 'Subject',
                MessageAttributes: { key1: { DataType: 'String', StringValue: 'value' } },
            });
            workerEventScheduler = new worker_event_scheduler_1.WorkerEventScheduler({
                endpoint: `${test_env_1.Env.URL}/api`,
                accessKeyId: test_env_1.Env.accessKeyId,
                secretAccessKey: test_env_1.Env.secretAccessKey,
            }, [common_1.SYSTEM_QUEUE_NAME.SNS], undefined, '*/2 * * * * *');
            await new Promise((resolve) => {
                interval = setInterval(async () => {
                    const published = await client.getPublish({ MessageId: PublishId });
                    if (published.Status === 'Published') {
                        resolve();
                        clearInterval(interval);
                        interval = undefined;
                    }
                }, 100);
            });
        });
        it('should update published events as completed when subscriptions to topic exists', async () => {
            let callReceivedResolver;
            nock_1.default('http://test.sns.subscription')
                .persist()
                .post('/valid', () => true)
                // eslint-disable-next-line func-names
                .reply(200, async function (path, body) {
                if (body.SubscribeURL) {
                    await new request_client_1.RequestClient().get(body.SubscribeURL);
                    return {};
                }
                chai_1.expect(body.Type).to.equal('Notification');
                chai_1.expect(body.MessageId).to.equal(PublishId);
                chai_1.expect(body.TopicArn).to.equal('arn:sqns:sns:sqns:1:Topic1');
                chai_1.expect(body.Subject).to.equal('Subject');
                chai_1.expect(body.Message).to.equal('This is message');
                chai_1.expect(body.SubscriptionArn).to.equal(SubscriptionArn);
                chai_1.expect(body.UnsubscribeURL).to.equal(`http://127.0.0.1:1234/api/sns?Action=Unsubscribe&SubscriptionArn=${SubscriptionArn}`);
                chai_1.expect(body.MessageAttributes).to.deep.equal({ key1: { Type: 'String', Value: 'value' } });
                chai_1.expect(this.req.headers['x-sqns-sns-message-id'][0]).to.equal(body.MessageId);
                chai_1.expect(this.req.headers['x-sqns-sns-message-type'][0]).to.equal('Notification');
                chai_1.expect(this.req.headers['x-sqns-sns-topic-arn'][0]).to.equal(body.TopicArn);
                chai_1.expect(this.req.headers['x-sqns-sns-subscription-arn'][0]).to.equal(body.SubscriptionArn);
                callReceivedResolver();
                return {};
            });
            ({ SubscriptionArn } = await client.subscribe({
                TopicArn: topic.TopicArn,
                Attributes: { key: 'value', key2: 'value2' },
                Endpoint: 'http://test.sns.subscription/valid',
                Protocol: 'http',
                ReturnSubscriptionArn: true,
            }));
            ({ MessageId: PublishId } = await client.publish({
                Message: 'This is message',
                TopicArn: topic.TopicArn,
                PhoneNumber: '9999999999',
                Subject: 'Subject',
                MessageAttributes: { key1: { DataType: 'String', StringValue: 'value' } },
            }));
            workerEventScheduler = new worker_event_scheduler_1.WorkerEventScheduler({
                endpoint: `${test_env_1.Env.URL}/api`,
                accessKeyId: test_env_1.Env.accessKeyId,
                secretAccessKey: test_env_1.Env.secretAccessKey,
            }, [common_1.SYSTEM_QUEUE_NAME.SNS], undefined, '*/2 * * * * *');
            // eslint-disable-next-line promise/param-names
            await new Promise((resolver) => (callReceivedResolver = resolver));
        });
        afterEach(() => {
            if (interval) {
                clearInterval(interval);
            }
            nock_1.default.cleanAll();
            workerEventScheduler.cancel();
        });
    });
});
//# sourceMappingURL=worker-event-scheduler.spec.js.map