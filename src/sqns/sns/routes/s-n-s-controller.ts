import { Request, Response } from 'express';
import { ExpressMiddleware } from '../../../../typings/express';
import { Encryption, SNSServerBody, SupportedProtocol } from '../../../client';
import { SNSServerJSONBody } from '../../../client/types/queue';
import { AwsXmlFormat } from '../../common/auth/aws-xml-format';
import { SQNSErrorCreator } from '../../common/auth/s-q-n-s-error-creator';
import { DeliveryPolicyHelper } from '../../common/helper/delivery-policy-helper';
import { ResponseHelper } from '../../common/helper/response-helper';
import { User } from '../../common/model/user';
import { ExpressHelper } from '../../common/routes/express-helper';
import { SNSManager } from '../manager/s-n-s-manager';

class SNSController {
  constructor(private serverURL: string, private snsManager: SNSManager) {}

  createTopicHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SNSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      this.updateDeliveryPolicyAndDisplayName(req.body);
      const { Name, displayName, Attributes, Tags, requestId, region, deliveryPolicy } = req.body;
      const topic = await this.snsManager.createTopic(Name, displayName, region, deliveryPolicy, req.user, Attributes, Tags);
      res.json(ResponseHelper.createTopic(requestId, topic));
    });
  }

  listTopicHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SNSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const { requestId, NextToken = 'eyJza2lwIjowfQ==' } = req.body;
      const { skip } = Encryption.decodeNextToken(NextToken) as { skip: number };
      const totalTopics = await this.snsManager.totalTopics();
      const topics = await this.snsManager.findTopics(skip);
      res.json(ResponseHelper.listTopic(requestId, topics, skip, totalTopics));
    });
  }

  getTopicAttributesHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SNSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const { TopicArn, requestId } = req.body;
      const topic = await this.snsManager.findTopicByARN(TopicArn);
      res.json(ResponseHelper.getTopicAttributes(requestId, topic));
    });
  }

  setTopicAttributesHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SNSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const { requestId, AttributeName, AttributeValue, TopicArn } = req.body;
      const topic = await this.snsManager.findTopicByARN(TopicArn);
      topic.updateAttributes(AttributeName, AttributeValue);
      await this.snsManager.updateTopicAttributes(topic);
      res.json(ResponseHelper.success(requestId));
    });
  }

  deleteTopicHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SNSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const { requestId, TopicArn } = req.body;
      const topic = await this.snsManager.findTopicByARN(TopicArn);
      const subscriptions = await this.snsManager.findSubscriptions({ topicARN: topic.arn }, 0, 0);
      await this.snsManager.removeSubscriptions(subscriptions);
      await this.snsManager.deleteTopic(topic);
      res.json(ResponseHelper.success(requestId));
    });
  }

  publishHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SNSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const { requestId, Message, MessageAttributes, MessageStructure, PhoneNumber, Subject, TargetArn, TopicArn } = req.body;
      const publish = await this.snsManager
        .publish(TopicArn, TargetArn, Message, PhoneNumber, Subject, MessageAttributes, MessageStructure);
      res.json(ResponseHelper.publish(requestId, publish));
    });
  }

  getPublishHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SNSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const { requestId, MessageId } = req.body;
      const publish = await this.snsManager.findPublishById(MessageId);
      res.json(ResponseHelper.getPublish(requestId, publish));
    });
  }

  subscribeHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SNSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const { requestId, Attributes, Endpoint, Protocol, TopicArn } = req.body;
      const topic = await this.snsManager.findTopicByARN(TopicArn);
      const subscription = await this.snsManager
        .subscribe(req.user, topic, Protocol.toLowerCase() as SupportedProtocol, Endpoint, Attributes);
      this.snsManager.requestSubscriptionConfirmation(subscription, this.serverURL);
      res.json(ResponseHelper.subscribe(requestId, subscription));
    });
  }

  unsubscribeHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SNSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const { requestId, SubscriptionArn } = req.body;
      const subscription = await this.snsManager.findSubscriptionFromArn(SubscriptionArn);
      await this.snsManager.removeSubscriptions([subscription]);
      res.json(ResponseHelper.success(requestId));
    });
  }

  listSubscriptionHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SNSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const { requestId, NextToken = 'eyJza2lwIjowfQ==' } = req.body;
      const { skip } = Encryption.decodeNextToken(NextToken) as { skip: number };
      const totalSubscriptions = await this.snsManager.totalSubscriptions();
      const subscriptions = await this.snsManager.findSubscriptions({}, skip, 100);
      res.json(ResponseHelper.listSubscriptionsResult(requestId, subscriptions, skip, totalSubscriptions));
    });
  }

  listSubscriptionByTopicHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SNSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const { requestId, TopicArn, NextToken = 'eyJza2lwIjowfQ==' } = req.body;
      const { skip } = Encryption.decodeNextToken(NextToken) as { skip: number };
      const totalSubscriptions = await this.snsManager.totalSubscriptions({ topicARN: TopicArn });
      const subscriptions = await this.snsManager.findSubscriptions({ topicARN: TopicArn }, skip, 100);
      res.json(ResponseHelper.listSubscriptionsResult(requestId, subscriptions, skip, totalSubscriptions));
    });
  }

  getSubscriptionHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SNSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const { requestId, SubscriptionArn } = req.body;
      const subscription = await this.snsManager.findSubscriptionFromArn(SubscriptionArn);
      res.json(ResponseHelper.getSubscription(requestId, req.sqnsBaseURL, subscription));
    });
  }

  publishedTopicHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SNSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const { requestId, MessageId } = req.body;
      const publish = await this.snsManager.findPublishById(MessageId);
      await this.snsManager.markPublished(publish);
      res.json(ResponseHelper.success(requestId));
    });
  }

  sns(): ExpressMiddleware {
    return ExpressHelper.requestHandler(async (req: Request & { serverBody: SNSServerBody; user: User; sqnsBaseURL: string }, res: Response)
      : Promise<any> => {
      switch (req.body.Action) {
        case 'CreateTopic': {
          this.updateDeliveryPolicyAndDisplayName(req.serverBody);
          const { Name, displayName, Attributes, Tags, requestId, region, deliveryPolicy } = req.serverBody;
          const topic = await this.snsManager.createTopic(Name, displayName, region, deliveryPolicy, req.user, Attributes, Tags);
          return res.send(AwsXmlFormat.createTopic(requestId, topic));
        }
        case 'GetTopicAttributes': {
          const { TopicArn, requestId } = req.serverBody;
          const topic = await this.snsManager.findTopicByARN(TopicArn);
          return res.send(AwsXmlFormat.getTopicAttributes(requestId, topic));
        }
        case 'ListTopics': {
          const { requestId, NextToken = 'eyJza2lwIjowfQ==' } = req.serverBody;
          const { skip } = Encryption.decodeNextToken(NextToken) as { skip: number };
          const totalTopics = await this.snsManager.totalTopics();
          const topics = await this.snsManager.findTopics(skip);
          return res.send(AwsXmlFormat.listTopicsResult(requestId, topics, skip, totalTopics));
        }
        case 'GetPublish': {
          const { requestId, MessageId } = req.serverBody;
          const publish = await this.snsManager.findPublishById(MessageId);
          return res.send(AwsXmlFormat.getPublish(requestId, publish));
        }
        case 'DeleteTopic': {
          const { requestId, TopicArn } = req.serverBody;
          const topic = await this.snsManager.findTopicByARN(TopicArn);
          const subscriptions = await this.snsManager.findSubscriptions({ topicARN: topic.arn }, 0, 0);
          await this.snsManager.removeSubscriptions(subscriptions);
          await this.snsManager.deleteTopic(topic);
          return res.send(AwsXmlFormat.deleteTopic(requestId));
        }
        case 'SetTopicAttributes': {
          const { requestId, AttributeName, AttributeValue, TopicArn } = req.serverBody;
          const topic = await this.snsManager.findTopicByARN(TopicArn);
          topic.updateAttributes(AttributeName, AttributeValue);
          await this.snsManager.updateTopicAttributes(topic);
          return res.send(AwsXmlFormat.setTopicAttributes(requestId));
        }
        case 'Publish': {
          const { requestId, Message, MessageAttributes, MessageStructure, PhoneNumber, Subject, TargetArn, TopicArn } = req.serverBody;
          const publish = await this.snsManager
            .publish(TopicArn, TargetArn, Message, PhoneNumber, Subject, MessageAttributes, MessageStructure);
          return res.send(AwsXmlFormat.publish(requestId, publish));
        }
        case 'Subscribe': {
          const { requestId, Attributes, Endpoint, Protocol, TopicArn } = req.serverBody;
          const topic = await this.snsManager.findTopicByARN(TopicArn);
          const subscription = await this.snsManager
            .subscribe(req.user, topic, Protocol.toLowerCase() as SupportedProtocol, Endpoint, Attributes);
          this.snsManager.requestSubscriptionConfirmation(subscription, this.serverURL);
          return res.send(AwsXmlFormat.subscribe(requestId, subscription));
        }
        case 'ListSubscriptions': {
          const { requestId, NextToken = 'eyJza2lwIjowfQ==' } = req.serverBody;
          const { skip } = Encryption.decodeNextToken(NextToken) as { skip: number };
          const totalSubscriptions = await this.snsManager.totalSubscriptions();
          const subscriptions = await this.snsManager.findSubscriptions({}, skip, 100);
          return res.send(AwsXmlFormat.listSubscriptionsResult(requestId, subscriptions, skip, totalSubscriptions));
        }
        case 'Unsubscribe': {
          return this.removeSubscription(req, res);
        }
        case 'ListSubscriptionsByTopic': {
          const { requestId, TopicArn, NextToken = 'eyJza2lwIjowfQ==' } = req.serverBody;
          const { skip } = Encryption.decodeNextToken(NextToken) as { skip: number };
          const totalSubscriptions = await this.snsManager.totalSubscriptions({ topicARN: TopicArn });
          const subscriptions = await this.snsManager.findSubscriptions({ topicARN: TopicArn }, skip, 100);
          return res.send(AwsXmlFormat.listSubscriptionsByTopicResult(requestId, subscriptions, skip, totalSubscriptions));
        }
        case 'MarkPublished': {
          const { requestId, MessageId } = req.serverBody;
          const publish = await this.snsManager.findPublishById(MessageId);
          await this.snsManager.markPublished(publish);
          return res.send(AwsXmlFormat.markPublished(requestId));
        }
        case 'GetSubscription': {
          const { requestId, SubscriptionArn } = req.serverBody;
          const subscription = await this.snsManager.findSubscriptionFromArn(SubscriptionArn);
          return res.send(AwsXmlFormat.getSubscription(requestId, req.sqnsBaseURL, subscription));
        }
        default:
          return SQNSErrorCreator.unhandledFunction(req.serverBody.Action);
      }
    });
  }

  private async confirmSubscription(
    req: Request & { serverBody: SNSServerBody; user: User; sqnsBaseURL: string },
    res: Response): Promise<void> {
    const { requestId, Token } = req.serverBody;
    const subscriptionVerificationToken = await this.snsManager.findSubscriptionVerificationToken(Token);
    let subscription = await this.snsManager.findSubscriptionFromArn(subscriptionVerificationToken.SubscriptionArn);
    subscription = await this.snsManager.confirmSubscription(subscription);
    res.send(AwsXmlFormat.confirmSubscription(requestId, subscription));
  }

  private async removeSubscription(
    req: Request & { serverBody: SNSServerBody; user: User; sqnsBaseURL: string },
    res: Response): Promise<void> {
    const { requestId, SubscriptionArn } = req.serverBody;
    const subscription = await this.snsManager.findSubscriptionFromArn(SubscriptionArn);
    await this.snsManager.removeSubscriptions([subscription]);
    res.send(AwsXmlFormat.unSubscribeSubscription(requestId));
  }

  private updateDeliveryPolicyAndDisplayName(body_: SNSServerBody): void {
    const body = body_;
    const Attributes = body.Attributes || { entry: [] };
    const deliveryPolicyKeyValue = Attributes.entry.filter(({ key }: { key: string }) => key === 'DeliveryPolicy')[0];
    DeliveryPolicyHelper.checkDeliveryPolicyCorrectness(deliveryPolicyKeyValue?.value);
    body.deliveryPolicy = deliveryPolicyKeyValue
      ? JSON.parse(deliveryPolicyKeyValue.value)
      : DeliveryPolicyHelper.DEFAULT_DELIVERY_POLICY;
    const displayNameKeyValue = Attributes.entry.filter(({ key }: { key: string }) => key === 'DisplayName')[0];
    body.displayName = displayNameKeyValue ? displayNameKeyValue.value : body.Name;
  }
}

export { SNSController };
