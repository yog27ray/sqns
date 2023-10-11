"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wait = exports.deleteAllQueues = exports.deleteTopics = exports.deleteDynamicDataOfResults = exports.Env = void 0;
const port = process.env.PORT || '1234';
const Env = {
    URL: `http://127.0.0.1:${port}`,
    PORT: Number(port),
    companyId: '12345',
    accessKeyId: 'accessKeyIdTest',
    secretAccessKey: 'secretAccessKeyTest',
};
exports.Env = Env;
async function findAllTopics(client, nextToken) {
    const listTopicsResponse = await client.listTopics({ NextToken: nextToken });
    const topics = listTopicsResponse.Topics.map(({ TopicArn }) => TopicArn);
    if (listTopicsResponse.NextToken) {
        const allTopics = await findAllTopics(client, listTopicsResponse.NextToken);
        topics.push(...allTopics);
    }
    return topics;
}
async function findAllQueues(client, nextToken) {
    const listQueuesResponse = await client.listQueues({ NextToken: nextToken });
    const queueUrls = listQueuesResponse.QueueUrls;
    if (listQueuesResponse.NextToken) {
        const allQueueURLs = await findAllQueues(client, listQueuesResponse.NextToken);
        queueUrls.push(...allQueueURLs);
    }
    return queueUrls;
}
async function deleteTopics(client, storageAdapter) {
    try {
        const topicARNs = await findAllTopics(client);
        await Promise.all(topicARNs.map((topicARN) => client.deleteTopic({ TopicArn: topicARN })));
    }
    catch (error) {
        await storageAdapter.initialize([{
                accessKey: Env.accessKeyId,
                secretAccessKey: Env.secretAccessKey,
            }]);
        await deleteTopics(client, storageAdapter);
    }
}
exports.deleteTopics = deleteTopics;
async function wait(time = 1000) {
    await new Promise((resolve) => {
        setTimeout(() => resolve(), time);
    });
}
exports.wait = wait;
async function deleteAllQueues(client, storageAdapter, mongoDBConnection) {
    try {
        const queueURLs = await findAllQueues(client);
        await Promise.all(queueURLs.map((queueURL) => client.deleteQueue({ QueueUrl: queueURL })));
    }
    catch (error) {
        await mongoDBConnection.collection(storageAdapter.getDBTableName('AccessKey')).deleteMany({});
        await storageAdapter.initialize([{
                accessKey: Env.accessKeyId,
                secretAccessKey: Env.secretAccessKey,
            }]);
        await wait();
        await deleteAllQueues(client, storageAdapter, mongoDBConnection);
    }
}
exports.deleteAllQueues = deleteAllQueues;
function deleteDynamicDataOfResults(items_) {
    const items = items_;
    delete items.ResponseMetadata;
    items.Messages
        .forEach((each_) => {
        const each = each_;
        delete each.MessageId;
        delete each.ReceiptHandle;
    });
}
exports.deleteDynamicDataOfResults = deleteDynamicDataOfResults;
//# sourceMappingURL=test-env.js.map