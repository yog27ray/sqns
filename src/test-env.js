"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAllQueues = exports.deleteTopics = exports.deleteDynamicDataOfResults = exports.Env = void 0;
const Env = {
    URL: 'http://127.0.0.1:1234',
    PORT: 1234,
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
async function deleteTopics(client) {
    const topicARNs = await findAllTopics(client);
    await Promise.all(topicARNs.map((topicARN) => client.deleteTopic({ TopicArn: topicARN })));
}
exports.deleteTopics = deleteTopics;
async function deleteAllQueues(client) {
    const queueURLs = await findAllQueues(client);
    await Promise.all(queueURLs.map((queueURL) => client.deleteQueue({ QueueUrl: queueURL })));
}
exports.deleteAllQueues = deleteAllQueues;
function deleteDynamicDataOfResults(items_) {
    const items = items_;
    delete items.ResponseMetadata;
    items.Messages.forEach((each_) => {
        const each = each_;
        delete each.MessageId;
        delete each.ReceiptHandle;
    });
}
exports.deleteDynamicDataOfResults = deleteDynamicDataOfResults;
//# sourceMappingURL=test-env.js.map