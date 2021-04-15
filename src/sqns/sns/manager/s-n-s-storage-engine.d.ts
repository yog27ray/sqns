import { ARN, MessageAttributes, MessageStructure, SupportedProtocol } from '../../../../typings';
import { TopicAttributes, TopicTag } from '../../../../typings/class-types';
import { DeliveryPolicy } from '../../../../typings/delivery-policy';
import { SubscriptionAttributes } from '../../../../typings/subscription';
import { BaseStorageEngine } from '../../common/model/base-storage-engine';
import { Publish } from '../../common/model/publish';
import { Subscription } from '../../common/model/subscription';
import { SubscriptionVerificationToken } from '../../common/model/subscription-verification-token';
import { Topic } from '../../common/model/topic';
import { User } from '../../common/model/user';
declare class SNSStorageEngine extends BaseStorageEngine {
    createTopic(name: string, displayName: string, region: string, deliveryPolicy: DeliveryPolicy, user: User, attributes: TopicAttributes, tags: TopicTag): Promise<Topic>;
    findTopicByARN(topicARN: string): Promise<Topic>;
    findTopics(skip: number): Promise<Array<Topic>>;
    findSubscriptions(where: {
        [key: string]: unknown;
    }, skip?: number, limit?: number): Promise<Array<Subscription>>;
    totalTopics(where: {
        [key: string]: unknown;
    }): Promise<number>;
    totalSubscriptions(where: {
        [key: string]: unknown;
    }): Promise<number>;
    deleteTopic(topic: Topic): Promise<void>;
    removeSubscriptions(subscriptions: Array<Subscription>): Promise<void>;
    updateTopicAttributes(topic: Topic): Promise<void>;
    createSubscription(user: User, topic: Topic, protocol: SupportedProtocol, endPoint: string, Attributes: SubscriptionAttributes): Promise<Subscription>;
    findSubscription(topic: Topic, protocol: string, endPoint: string): Promise<Subscription>;
    createSubscriptionVerificationToken(subscription: Subscription): Promise<SubscriptionVerificationToken>;
    findSubscriptionVerificationToken(token: string): Promise<SubscriptionVerificationToken>;
    findSubscriptionFromArn(subscriptionArn: string): Promise<Subscription>;
    confirmSubscription(subscription: Subscription): Promise<Subscription>;
    findPublish(id: string): Promise<Publish>;
    markPublished(publish: Publish): Promise<void>;
    publish(topicArn: ARN, targetArn: ARN, Message: string, PhoneNumber: string, Subject: string, messageAttributes: MessageAttributes, messageStructure: string, MessageStructureFinal: MessageStructure): Promise<Publish>;
}
export { SNSStorageEngine };
