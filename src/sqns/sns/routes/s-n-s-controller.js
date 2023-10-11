"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SNSController = void 0;
const aws_xml_format_1 = require("../../common/auth/aws-xml-format");
const encryption_1 = require("../../common/auth/encryption");
const s_q_n_s_error_1 = require("../../common/auth/s-q-n-s-error");
const delivery_policy_helper_1 = require("../../common/helper/delivery-policy-helper");
const express_helper_1 = require("../../common/routes/express-helper");
class SNSController {
    constructor(serverURL, snsManager) {
        this.serverURL = serverURL;
        this.snsManager = snsManager;
    }
    snsGet() {
        return express_helper_1.ExpressHelper.requestHandler(async (req, res) => {
            switch (req.serverBody.Action) {
                case 'SubscriptionConfirmation': {
                    return this.confirmSubscription(req, res);
                }
                case 'Unsubscribe': {
                    return this.removeSubscription(req, res);
                }
                default:
                    return s_q_n_s_error_1.SQNSError.unhandledFunction(req.serverBody.Action);
            }
        });
    }
    sns() {
        return express_helper_1.ExpressHelper.requestHandler(async (req, res) => {
            switch (req.body.Action) {
                case 'CreateTopic': {
                    this.updateDeliveryPolicyAndDisplayName(req.serverBody);
                    const { Name, displayName, Attributes, Tags, requestId, region, deliveryPolicy } = req.serverBody;
                    const topic = await this.snsManager.createTopic(Name, displayName, region, deliveryPolicy, req.user, Attributes, Tags);
                    return res.send(aws_xml_format_1.AwsXmlFormat.createTopic(requestId, topic));
                }
                case 'GetTopicAttributes': {
                    const { TopicArn, requestId } = req.serverBody;
                    const topic = await this.snsManager.findTopicByARN(TopicArn);
                    return res.send(aws_xml_format_1.AwsXmlFormat.getTopicAttributes(requestId, topic));
                }
                case 'ListTopics': {
                    const { requestId, NextToken = 'eyJza2lwIjowfQ==' } = req.serverBody;
                    const { skip } = encryption_1.Encryption.decodeNextToken(NextToken);
                    const totalTopics = await this.snsManager.totalTopics();
                    const topics = await this.snsManager.findTopics(skip);
                    return res.send(aws_xml_format_1.AwsXmlFormat.listTopicsResult(requestId, topics, skip, totalTopics));
                }
                case 'GetPublish': {
                    const { requestId, MessageId } = req.serverBody;
                    const publish = await this.snsManager.findPublishById(MessageId);
                    return res.send(aws_xml_format_1.AwsXmlFormat.getPublish(requestId, publish));
                }
                case 'DeleteTopic': {
                    const { requestId, TopicArn } = req.serverBody;
                    const topic = await this.snsManager.findTopicByARN(TopicArn);
                    const subscriptions = await this.snsManager.findSubscriptions({ topicARN: topic.arn }, 0, 0);
                    await this.snsManager.removeSubscriptions(subscriptions);
                    await this.snsManager.deleteTopic(topic);
                    return res.send(aws_xml_format_1.AwsXmlFormat.deleteTopic(requestId));
                }
                case 'SetTopicAttributes': {
                    const { requestId, AttributeName, AttributeValue, TopicArn } = req.serverBody;
                    const topic = await this.snsManager.findTopicByARN(TopicArn);
                    topic.updateAttributes(AttributeName, AttributeValue);
                    await this.snsManager.updateTopicAttributes(topic);
                    return res.send(aws_xml_format_1.AwsXmlFormat.setTopicAttributes(requestId));
                }
                case 'Publish': {
                    const { requestId, Message, MessageAttributes, MessageStructure, PhoneNumber, Subject, TargetArn, TopicArn } = req.serverBody;
                    const publish = await this.snsManager
                        .publish(TopicArn, TargetArn, Message, PhoneNumber, Subject, MessageAttributes, MessageStructure);
                    return res.send(aws_xml_format_1.AwsXmlFormat.publish(requestId, publish));
                }
                case 'Subscribe': {
                    const { requestId, Attributes, Endpoint, Protocol, TopicArn, ReturnSubscriptionArn } = req.serverBody;
                    const topic = await this.snsManager.findTopicByARN(TopicArn);
                    const subscription = await this.snsManager
                        .subscribe(req.user, topic, Protocol.toLowerCase(), Endpoint, Attributes);
                    this.snsManager.requestSubscriptionConfirmation(subscription, this.serverURL);
                    return res.send(aws_xml_format_1.AwsXmlFormat.subscribe(requestId, subscription, ReturnSubscriptionArn));
                }
                case 'ConfirmSubscription': {
                    return this.confirmSubscription(req, res);
                }
                case 'ListSubscriptions': {
                    const { requestId, NextToken = 'eyJza2lwIjowfQ==' } = req.serverBody;
                    const { skip } = encryption_1.Encryption.decodeNextToken(NextToken);
                    const totalSubscriptions = await this.snsManager.totalSubscriptions();
                    const subscriptions = await this.snsManager.findSubscriptions({}, skip, 100);
                    return res.send(aws_xml_format_1.AwsXmlFormat.listSubscriptionsResult(requestId, subscriptions, skip, totalSubscriptions));
                }
                case 'Unsubscribe': {
                    return this.removeSubscription(req, res);
                }
                case 'ListSubscriptionsByTopic': {
                    const { requestId, TopicArn, NextToken = 'eyJza2lwIjowfQ==' } = req.serverBody;
                    const { skip } = encryption_1.Encryption.decodeNextToken(NextToken);
                    const totalSubscriptions = await this.snsManager.totalSubscriptions({ topicARN: TopicArn });
                    const subscriptions = await this.snsManager.findSubscriptions({ topicARN: TopicArn }, skip, 100);
                    return res.send(aws_xml_format_1.AwsXmlFormat.listSubscriptionsByTopicResult(requestId, subscriptions, skip, totalSubscriptions));
                }
                case 'MarkPublished': {
                    const { requestId, MessageId } = req.serverBody;
                    const publish = await this.snsManager.findPublishById(MessageId);
                    await this.snsManager.markPublished(publish);
                    return res.send(aws_xml_format_1.AwsXmlFormat.markPublished(requestId));
                }
                case 'GetSubscription': {
                    const { requestId, SubscriptionArn } = req.serverBody;
                    const subscription = await this.snsManager.findSubscriptionFromArn(SubscriptionArn);
                    return res.send(aws_xml_format_1.AwsXmlFormat.getSubscription(requestId, req.sqnsBaseURL, subscription));
                }
                default:
                    return s_q_n_s_error_1.SQNSError.unhandledFunction(req.serverBody.Action);
            }
        });
    }
    async confirmSubscription(req, res) {
        const { requestId, Token } = req.serverBody;
        const subscriptionVerificationToken = await this.snsManager.findSubscriptionVerificationToken(Token);
        let subscription = await this.snsManager.findSubscriptionFromArn(subscriptionVerificationToken.SubscriptionArn);
        subscription = await this.snsManager.confirmSubscription(subscription);
        res.send(aws_xml_format_1.AwsXmlFormat.confirmSubscription(requestId, subscription));
    }
    async removeSubscription(req, res) {
        const { requestId, SubscriptionArn } = req.serverBody;
        const subscription = await this.snsManager.findSubscriptionFromArn(SubscriptionArn);
        await this.snsManager.removeSubscriptions([subscription]);
        res.send(aws_xml_format_1.AwsXmlFormat.unSubscribeSubscription(requestId));
    }
    updateDeliveryPolicyAndDisplayName(body_) {
        const body = body_;
        const Attributes = body.Attributes || { entry: [] };
        const deliveryPolicyKeyValue = Attributes.entry.filter(({ key }) => key === 'DeliveryPolicy')[0];
        delivery_policy_helper_1.DeliveryPolicyHelper.checkDeliveryPolicyCorrectness(deliveryPolicyKeyValue === null || deliveryPolicyKeyValue === void 0 ? void 0 : deliveryPolicyKeyValue.value);
        body.deliveryPolicy = deliveryPolicyKeyValue
            ? JSON.parse(deliveryPolicyKeyValue.value)
            : delivery_policy_helper_1.DeliveryPolicyHelper.DEFAULT_DELIVERY_POLICY;
        const displayNameKeyValue = Attributes.entry.filter(({ key }) => key === 'DisplayName')[0];
        body.displayName = displayNameKeyValue ? displayNameKeyValue.value : body.Name;
    }
}
exports.SNSController = SNSController;
//# sourceMappingURL=s-n-s-controller.js.map