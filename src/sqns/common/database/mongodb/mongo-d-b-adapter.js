"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoDBAdapter = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("../../logger/logger");
const access_key_1 = require("../../model/access-key");
const event_item_1 = require("../../model/event-item");
const publish_1 = require("../../model/publish");
const queue_1 = require("../../model/queue");
const subscription_1 = require("../../model/subscription");
const subscription_verification_token_1 = require("../../model/subscription-verification-token");
const topic_1 = require("../../model/topic");
const user_1 = require("../../model/user");
const mongo_d_b_connection_1 = require("./mongo-d-b-connection");
const log = logger_1.logger.instance('MongoDBAdapter');
class MongoDBAdapter {
    constructor(config) {
        const option = { ...config };
        log.info('DatabaseConfig', option);
        if (!option.uri) {
            throw Error('Database URI is missing');
        }
        const { uri } = option;
        delete option.uri;
        this.connection = new mongo_d_b_connection_1.MongoDBConnection(uri, option);
    }
    static dbToSystemItem(row) {
        const document = { ...row };
        document.id = document._id;
        delete document._id;
        return document;
    }
    static getTableName(tableName) {
        return `${MongoDBAdapter.QUEUE_TABLE_PREFIX}${tableName}`;
    }
    getDBTableName(tableName) {
        return MongoDBAdapter.getTableName(tableName);
    }
    async addEventItem(queue, eventItem) {
        const mongoDocument = eventItem.toJSON();
        mongoDocument._id = mongoDocument.id || uuid_1.v4();
        delete mongoDocument.id;
        try {
            await this.connection.insert(MongoDBAdapter.Table.Event, mongoDocument);
        }
        catch (error) {
            if (error.code === 11000 && mongoDocument.MessageDeduplicationId) {
                const dBItem = await this.connection.findOne(MongoDBAdapter.Table.Event, {
                    MessageDeduplicationId: mongoDocument.MessageDeduplicationId,
                });
                if (!dBItem) {
                    await Promise.reject(error);
                }
                mongoDocument._id = dBItem._id;
            }
            else {
                await Promise.reject(error);
            }
        }
        const insertedMongoDocument = await this.connection.findOne(MongoDBAdapter.Table.Event, { _id: mongoDocument._id });
        if (!insertedMongoDocument) {
            return undefined;
        }
        return new event_item_1.EventItem(MongoDBAdapter.dbToSystemItem(insertedMongoDocument));
    }
    async findEventsToProcess(time, limit) {
        const query = { maxAttemptCompleted: false, completionPending: true, eventTime: { $lt: time } };
        const mongoDocuments = await this.connection.find(MongoDBAdapter.Table.Event, query, { eventTime: -1 }, { limit });
        log.info('DB Fetch', query, 'Result length: ', mongoDocuments.length);
        return mongoDocuments.map((mongoDocument) => new event_item_1.EventItem(MongoDBAdapter.dbToSystemItem(mongoDocument)));
    }
    async getQueues(queueARNPrefix) {
        const query = {};
        if (queueARNPrefix) {
            query.arn = { $regex: `^${queueARNPrefix}` };
        }
        const queues = await this.connection.find(MongoDBAdapter.Table.Queue, query, { createdAt: 1 });
        return queues.map((queue) => new queue_1.Queue(MongoDBAdapter.dbToSystemItem(queue)));
    }
    async updateEvent(id, data) {
        await this.connection.update(MongoDBAdapter.Table.Event, id, data);
    }
    async findById(id) {
        const event = await this.connection.findOne(MongoDBAdapter.Table.Event, { _id: id });
        if (!event) {
            return undefined;
        }
        return new event_item_1.EventItem(MongoDBAdapter.dbToSystemItem(event));
    }
    async findByIdForQueue(queue, id) {
        const event = await this.connection.findOne(MongoDBAdapter.Table.Event, { _id: id, queueARN: queue.arn });
        if (!event) {
            return undefined;
        }
        return new event_item_1.EventItem(MongoDBAdapter.dbToSystemItem(event));
    }
    async findByDeduplicationIdForQueue(queue, id) {
        const event = await this.connection.findOne(MongoDBAdapter.Table.Event, { MessageDeduplicationId: id, queueARN: queue.arn });
        if (!event) {
            return undefined;
        }
        return new event_item_1.EventItem(MongoDBAdapter.dbToSystemItem(event));
    }
    async createQueue(user, queueName, region, attributes, tags) {
        let queue = await this.getQueue(queue_1.Queue.arn(user.organizationId, region, queueName));
        if (!queue) {
            queue = new queue_1.Queue({
                id: uuid_1.v4(),
                attributes,
                name: queueName,
                tags,
                ownerId: user === null || user === void 0 ? void 0 : user.id,
                companyId: user === null || user === void 0 ? void 0 : user.organizationId,
                region,
            });
            await this.connection.insert(MongoDBAdapter.Table.Queue, queue.toJSON());
        }
        return queue;
    }
    async getQueue(queueArn) {
        const dbQueue = await this.connection.findOne(MongoDBAdapter.Table.Queue, { arn: queueArn });
        if (!dbQueue) {
            return undefined;
        }
        return new queue_1.Queue(MongoDBAdapter.dbToSystemItem(dbQueue));
    }
    async deleteQueue(queue) {
        await this.connection.deleteOne(MongoDBAdapter.Table.Queue, { _id: queue.id });
        await this.connection.deleteMany(MongoDBAdapter.Table.Event, { queueId: queue.id });
    }
    async confirmSubscription(subscription_) {
        const subscription = subscription_;
        await this.connection.update(MongoDBAdapter.Table.Subscription, subscription.id, { confirmed: true });
        subscription.confirmed = true;
        return subscription;
    }
    async createPublish(topicArn, targetArn, Message, PhoneNumber, Subject, messageAttributes, messageStructure, MessageStructureFinal, status) {
        const publish = new publish_1.Publish({
            id: uuid_1.v4(),
            topicArn,
            targetArn,
            Message,
            PhoneNumber,
            Subject,
            MessageAttributes: messageAttributes,
            MessageStructure: messageStructure,
            MessageStructureFinal,
            Status: status,
        });
        await this.connection.insert(MongoDBAdapter.Table.Publish, publish.toJSON());
        return publish;
    }
    async createSubscription(user, topic, protocol, endPoint, Attributes, deliveryPolicy) {
        const subscription = new subscription_1.Subscription({
            id: uuid_1.v4(),
            companyId: user.organizationId,
            protocol,
            endPoint,
            Attributes,
            topicARN: topic.arn,
            region: topic.region,
            confirmed: false,
            DeliveryPolicy: deliveryPolicy,
        });
        await this.connection.insert(MongoDBAdapter.Table.Subscription, subscription.toJSON());
        return subscription;
    }
    async createSubscriptionVerificationToken(subscription, token) {
        const subscriptionVerificationToken = new subscription_verification_token_1.SubscriptionVerificationToken({
            id: uuid_1.v4(),
            token,
            SubscriptionArn: subscription.arn,
            TopicArn: subscription.topicARN,
            Type: 'SubscriptionConfirmation',
        });
        await this.connection.insert(MongoDBAdapter.Table.SubscriptionVerificationToken, subscriptionVerificationToken.toJSON());
        return subscriptionVerificationToken;
    }
    async findSubscriptionVerificationTokenByToken(token) {
        const subscriptionVerificationToken = await this.connection.findOne(MongoDBAdapter.Table.SubscriptionVerificationToken, { token });
        if (!subscriptionVerificationToken) {
            return undefined;
        }
        return new subscription_verification_token_1.SubscriptionVerificationToken(MongoDBAdapter.dbToSystemItem(subscriptionVerificationToken));
    }
    async createTopic(name, displayName, region, deliveryPolicy, user, attributes, tags) {
        const topic = new topic_1.Topic({
            id: uuid_1.v4(),
            companyId: user.organizationId,
            name,
            region,
            displayName,
            deliveryPolicy,
            tags,
            attributes,
        });
        await this.connection.insert(MongoDBAdapter.Table.Topic, topic.toJSON());
        return topic;
    }
    async deleteTopic(topic) {
        await this.connection.deleteOne(MongoDBAdapter.Table.Topic, { _id: topic.id });
    }
    async findPublishes(query, skip, limit) {
        const publishes = await this.connection.find(MongoDBAdapter.Table.Publish, query, { createdAt: 1 }, { skip, limit });
        return publishes.map((publish) => new publish_1.Publish(MongoDBAdapter.dbToSystemItem(publish)));
    }
    async findSubscriptions(where, skip, limit) {
        const subscriptions = await this.connection.find(MongoDBAdapter.Table.Subscription, where, { createdAt: 1 }, { skip, limit });
        return subscriptions.map((subscription) => new subscription_1.Subscription(MongoDBAdapter.dbToSystemItem(subscription)));
    }
    async findTopicARN(arn) {
        const topic = await this.connection.findOne(MongoDBAdapter.Table.Topic, { arn });
        if (!topic) {
            return undefined;
        }
        return new topic_1.Topic(MongoDBAdapter.dbToSystemItem(topic));
    }
    async findTopics(where, skip, limit) {
        const topics = await this.connection.find(MongoDBAdapter.Table.Topic, where, { createdAt: 1 }, { skip, limit });
        return topics.map((topic) => new topic_1.Topic(MongoDBAdapter.dbToSystemItem(topic)));
    }
    async markPublished(publish_) {
        const publish = publish_;
        await this.connection.update(MongoDBAdapter.Table.Publish, publish.id, { Status: publish_1.Publish.STATUS_PUBLISHED });
        publish.Status = publish_1.Publish.STATUS_PUBLISHED;
    }
    async removeSubscriptions(subscriptions) {
        await this.connection.deleteMany(MongoDBAdapter.Table.Subscription, {
            _id: { $in: subscriptions.map((subscription) => subscription.id) },
        });
    }
    totalSubscriptions(where) {
        return this.connection.count(MongoDBAdapter.Table.Subscription, where);
    }
    totalTopics(where) {
        return this.connection.count(MongoDBAdapter.Table.Topic, where);
    }
    async updateTopicAttributes(topic) {
        await this.connection.update(MongoDBAdapter.Table.Topic, topic.id, { attributes: topic.attributes });
    }
    async findAccessKeys(where, skip, limit) {
        const accessKeys = await this.connection.find(MongoDBAdapter.Table.AccessKey, where, { createdAt: 1 }, { skip, limit });
        return accessKeys.map((accessKey) => new access_key_1.AccessKey(MongoDBAdapter.dbToSystemItem(accessKey)));
    }
    async findUsers(where, skip, limit) {
        const users = await this.connection.find(MongoDBAdapter.Table.User, where, { createdAt: 1 }, { skip, limit });
        return users.map((user) => new user_1.User(MongoDBAdapter.dbToSystemItem(user)));
    }
    async accessKey(accessKey, secretKey, userId) {
        const accessKeyObject = new access_key_1.AccessKey({ id: uuid_1.v4(), accessKey, secretKey, userId });
        await this.connection.insert(MongoDBAdapter.Table.AccessKey, accessKeyObject.toJSON());
        return accessKeyObject;
    }
    async createUser(organizationId) {
        const user = new user_1.User({ id: uuid_1.v4(), organizationId });
        await this.connection.insert(MongoDBAdapter.Table.User, user.toJSON());
        return user;
    }
    async updateAccessKey(accessKey) {
        await this.connection.update(MongoDBAdapter.Table.AccessKey, accessKey.id, accessKey.toJSON());
        const [result] = await this.findAccessKeys({ id: accessKey.id }, 0, 1);
        return result;
    }
}
exports.MongoDBAdapter = MongoDBAdapter;
MongoDBAdapter.QUEUE_TABLE_PREFIX = '';
MongoDBAdapter.Table = {
    AccessKey: MongoDBAdapter.getTableName('AccessKey'),
    User: MongoDBAdapter.getTableName('User'),
    Event: MongoDBAdapter.getTableName('Event'),
    Queue: MongoDBAdapter.getTableName('Queues'),
    Topic: MongoDBAdapter.getTableName('Topic'),
    Subscription: MongoDBAdapter.getTableName('Subscription'),
    SubscriptionVerificationToken: MongoDBAdapter.getTableName('SubscriptionVerificationToken'),
    Publish: MongoDBAdapter.getTableName('Publish'),
};
//# sourceMappingURL=mongo-d-b-adapter.js.map