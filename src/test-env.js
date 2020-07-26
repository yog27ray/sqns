"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDynamicDataOfResults = exports.deleteQueues = exports.Env = void 0;
const Env = {
    URL: 'http://localhost:1234',
    PORT: 1234,
    region: 'testRegion',
    accessKeyId: 'accessKeyIdTest',
    secretAccessKey: 'secretAccessKeyTest',
};
exports.Env = Env;
async function deleteQueues(client) {
    const { QueueUrls } = await client.listQueues();
    await Promise.all(QueueUrls.map((QueueUrl) => client.deleteQueue({ QueueUrl }).catch(() => 0)));
}
exports.deleteQueues = deleteQueues;
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