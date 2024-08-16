import xml2js from 'xml2js';
import { Encryption, EventItem, KeyValue, MessageAttributeMap, MessageAttributeValue } from '../../../client';
import { Publish } from '../model/publish';
import { Queue } from '../model/queue';
import { Subscription } from '../model/subscription';
import { Topic } from '../model/topic';
import { ResponseHelper } from '../helper/response-helper';

class AwsXmlFormat {
  static jsonToXML(rootName: string, keyValue: KeyValue): string {
    const builder = new xml2js.Builder({ rootName });
    return builder.buildObject(keyValue) as string;
  }

  static errorResponse(requestId: string, code: string, message: string, details?: string): string {
    const json = {
      RequestId: requestId,
      Error: {
        Type: 'Sender',
        Code: code,
        Message: message,
        Detail: details,
      },
    };
    return AwsXmlFormat.jsonToXML('ErrorResponse', json);
  }

  static createQueue(requestId: string, host: string, queue: Queue): string {
    const json = {
      CreateQueueResult: { QueueUrl: ResponseHelper.generateSQSURL(queue, host) },
      ResponseMetadata: { RequestId: requestId },
    };
    return AwsXmlFormat.jsonToXML('CreateQueueResponse', json);
  }

  static getQueueURL(requestId: string, host: string, queue: Queue): string {
    const json = {
      GetQueueUrlResult: { QueueUrl: ResponseHelper.generateSQSURL(queue, host) },
      ResponseMetadata: { RequestId: requestId },
    };
    return AwsXmlFormat.jsonToXML('GetQueueURLResponse', json);
  }

  static getSubscription(requestId: string, host: string, subscription: Subscription): string {
    const Attributes = {};
    subscription.Attributes.entry.forEach(({ key, value }: { key: string; value: string; }) => Attributes[key] = value);
    const json = {
      GetSubscriptionResult: {
        Protocol: subscription.protocol,
        EndPoint: subscription.endPoint,
        Attributes,
        TopicARN: subscription.topicARN,
        ARN: subscription.arn,
        UnsubscribeUrl: subscription.getUnSubscribeURL(host),
      },
      ResponseMetadata: { RequestId: requestId },
    };
    return AwsXmlFormat.jsonToXML('GetSubscriptionResponse', json);
  }

  static deleteQueue(requestId: string): string {
    const json = { ResponseMetadata: { RequestId: requestId } };
    return AwsXmlFormat.jsonToXML('DeleteQueueResponse', json);
  }

  static listQueues(requestId: string, host: string, queues: Array<Queue>): string {
    const json = {
      ListQueuesResult: { QueueUrl: queues.map((queue: Queue) => ResponseHelper.generateSQSURL(queue, host)) },
      ResponseMetadata: { RequestId: requestId },
    };
    return AwsXmlFormat.jsonToXML('ListQueuesResponse', json);
  }

  static sendMessage(requestId: string, event: EventItem): string {
    const json = {
      SendMessageResult: AwsXmlFormat.generateSendMessageResponse(event),
      ResponseMetadata: { RequestId: requestId },
    };
    return AwsXmlFormat.jsonToXML('SendMessageResponse', json);
  }

  static generateSendMessageResponse(event: EventItem): Record<string, unknown> {
    return {
      MessageId: event.id,
      MD5OfMessageBody: Encryption.createHash('md5', event.MessageBody),
      MD5OfMessageAttributes: Encryption.createJSONHash('md5', event.MessageAttribute),
    };
  }

  static sendMessageBatch(requestId: string, events: Array<EventItem>, batchIds: Array<string>): string {
    const eventsResponse = events.map((event: EventItem) => AwsXmlFormat.generateSendMessageResponse(event));
    eventsResponse.forEach((each: unknown, index: number) => {
      Object.assign(each, { Id: batchIds[index] });
    });
    const json = {
      SendMessageBatchResult: { SendMessageBatchResultEntry: eventsResponse },
      ResponseMetadata: { RequestId: requestId },
    };
    return AwsXmlFormat.jsonToXML('SendMessageBatchResponse', json);
  }

  static findMessageById(requestId: string, eventItem: EventItem): string {
    const message = ResponseHelper.responseMessage(eventItem, ['ALL'], ['ALL']);
    if (message) {
      message.State = eventItem.state;
      message.EventTime = eventItem.originalEventTime.toISOString();
      message.MessageAttributes = AwsXmlFormat.transformNameValueArrayToMap(message.MessageAttribute);
      message.Attributes = AwsXmlFormat.transformNameValueArrayToMap(message.Attribute);
      delete message.MessageAttribute;
      delete message.Attribute;
    }
    const json: Record<string, unknown> = {
      ResponseMetadata: { RequestId: requestId },
      FindMessageByIdResult: {
        Message: message,
      },
    };
    return AwsXmlFormat.jsonToXML('FindMessageByIdResponse', json);
  }

  static findMessageByDeduplicationId(requestId: string, eventItem: EventItem): string {
    const message = ResponseHelper.responseMessage(eventItem, ['ALL'], ['ALL']);
    if (message) {
      message.State = eventItem.state;
      message.EventTime = eventItem.originalEventTime.toISOString();
      message.MessageAttributes = AwsXmlFormat.transformNameValueArrayToMap(message.MessageAttribute);
      message.Attributes = AwsXmlFormat.transformNameValueArrayToMap(message.Attribute);
      delete message.MessageAttribute;
      delete message.Attribute;
    }
    const json: Record<string, unknown> = {
      ResponseMetadata: { RequestId: requestId },
      FindMessageByDeduplicationIdResult: {
        Message: message,
      },
    };
    return AwsXmlFormat.jsonToXML('FindMessageByDeduplicationIdResponse', json);
  }

  static updateMessageById(requestId: string, eventItem: EventItem): string {
    const message = ResponseHelper.responseMessage(eventItem, ['ALL'], ['ALL']);
    if (message) {
      message.State = eventItem.state;
      message.EventTime = eventItem.eventTime.toISOString();
      message.MessageAttributes = AwsXmlFormat.transformNameValueArrayToMap(
        message.MessageAttribute as Array<{ Name: string; Value: MessageAttributeValue; }>);
      message.Attributes = AwsXmlFormat.transformNameValueArrayToMap(
        message.Attribute as Array<{ Name: string; Value: MessageAttributeValue; }>);
      delete message.MessageAttribute;
      delete message.Attribute;
    }
    const json: Record<string, unknown> = {
      ResponseMetadata: { RequestId: requestId },
      UpdateMessageByIdResult: {
        Message: message,
      },
    };
    return AwsXmlFormat.jsonToXML('UpdateMessageByIdResponse', json);
  }

  static updateMessageByDeduplicationId(requestId: string, eventItem: EventItem): string {
    const message = ResponseHelper.responseMessage(eventItem, ['ALL'], ['ALL']);
    if (message) {
      message.State = eventItem.state;
      message.EventTime = eventItem.eventTime.toISOString();
      message.MessageAttributes = AwsXmlFormat.transformNameValueArrayToMap(
        message.MessageAttribute as Array<{ Name: string; Value: MessageAttributeValue; }>);
      message.Attributes = AwsXmlFormat.transformNameValueArrayToMap(
        message.Attribute as Array<{ Name: string; Value: MessageAttributeValue; }>);
      delete message.MessageAttribute;
      delete message.Attribute;
    }
    const json: Record<string, unknown> = {
      ResponseMetadata: { RequestId: requestId },
      UpdateMessageByDeduplicationIdResult: {
        Message: message,
      },
    };
    return AwsXmlFormat.jsonToXML('UpdateMessageByDeduplicationIdResponse', json);
  }

  static receiveMessage(requestId: string, messages: Array<EventItem>, AttributeName: Array<string>, MessageAttributeName: Array<string>)
    : string {
    const json: KeyValue = {
      ResponseMetadata: { RequestId: requestId },
      ReceiveMessageResult: {
        Message: messages.map((message: EventItem) => ResponseHelper.responseMessage(message, AttributeName, MessageAttributeName)),
      },
    };
    return AwsXmlFormat.jsonToXML('ReceiveMessageResponse', json);
  }

  static createTopic(requestId: string, topic: Topic): string {
    const json: Record<string, unknown> = {
      CreateTopicResult: { TopicArn: topic.arn },
      ResponseMetadata: {
        RequestId: requestId,
      },
    };
    return AwsXmlFormat.jsonToXML('CreateTopicResponse', json);
  }

  static listTopicsResult(requestId: string, topics: Array<Topic>, skip: number, total: number): string {
    const json: Record<string, unknown> = {
      ListTopicsResult: { Topics: { member: topics.map((topic: Topic) => ({ TopicArn: topic.arn })) } },
      ResponseMetadata: { RequestId: requestId },
    };
    if ((skip + topics.length) < total) {
      (json.ListTopicsResult as { NextToken: string }).NextToken = Encryption.encodeNextToken({ skip: skip + topics.length });
    }
    return AwsXmlFormat.jsonToXML('ListTopicsResponse', json);
  }

  static deleteTopic(requestId: string): string {
    const json: Record<string, unknown> = { ResponseMetadata: { RequestId: requestId } };
    return AwsXmlFormat.jsonToXML('DeleteTopicResponse', json);
  }

  static setTopicAttributes(requestId: string): string {
    const json: Record<string, unknown> = { ResponseMetadata: { RequestId: requestId } };
    return AwsXmlFormat.jsonToXML('SetTopicAttributesResponse', json);
  }

  static publish(requestId: string, publish: Publish): string {
    const json: Record<string, unknown> = {
      PublishResult: { MessageId: publish.id },
      ResponseMetadata: { RequestId: requestId },
    };
    return AwsXmlFormat.jsonToXML('PublishResponse', json);
  }

  static subscribe(requestId: string, subscription: Subscription, ReturnSubscriptionArn?: boolean): string {
    const json: Record<string, unknown> = {
      SubscribeResult: { SubscriptionArn: this.getSubscriptionARN(subscription, ReturnSubscriptionArn) },
      ResponseMetadata: { RequestId: requestId },
    };
    return AwsXmlFormat.jsonToXML('SubscribeResponse', json);
  }

  static confirmSubscription(requestId: string, subscription: Subscription): string {
    const json: Record<string, unknown> = {
      ConfirmSubscriptionResult: { SubscriptionArn: this.getSubscriptionARN(subscription) },
      ResponseMetadata: { RequestId: requestId },
    };
    return AwsXmlFormat.jsonToXML('ConfirmSubscriptionResponse', json);
  }

  static unSubscribeSubscription(requestId: string): string {
    const json: Record<string, unknown> = {
      UnsubscribeResult: {},
      ResponseMetadata: { RequestId: requestId },
    };
    return AwsXmlFormat.jsonToXML('UnsubscribeResponse', json);
  }

  static getPublish(requestId: string, publish: Publish): string {
    const publishJSON = {
      MessageId: publish.id,
      MessageAttributes: AwsXmlFormat.transformNameValueArrayToMap(publish.MessageAttributes.entry),
      PublishArn: publish.destinationArn,
    };
    ['Message', 'PhoneNumber', 'Subject', 'MessageStructure', 'Status'].forEach((key: string) => {
      if (publish[key]) {
        publishJSON[key] = publish[key];
      }
    });
    const json: Record<string, unknown> = {
      GetPublish: publishJSON,
      ResponseMetadata: { RequestId: requestId },
    };
    return AwsXmlFormat.jsonToXML('GetPublishResponse', json);
  }

  static markPublished(requestId: string): string {
    const json: Record<string, unknown> = {
      ResponseMetadata: { RequestId: requestId },
    };
    return AwsXmlFormat.jsonToXML('MarkPublishedResponse', json);
  }

  static getTopicAttributes(requestId: string, topic: Topic): string {
    const entry = topic.attributes.entry
      .filter((each: { key: string, value: string }) => !['DeliveryPolicy'].includes(each.key))
      .map((each: { key: string, value: string }) => each);
    entry.push({ key: 'SubscriptionsConfirmed', value: '0' });
    entry.push({ key: 'SubscriptionsPending', value: '0' });
    entry.push({ key: 'SubscriptionsDeleted', value: '0' });
    entry.push({ key: 'TopicArn', value: topic.arn });
    entry.push({ key: 'EffectiveDeliveryPolicy', value: JSON.stringify(topic.deliveryPolicy) });
    const json: Record<string, unknown> = {
      GetTopicAttributesResult: { Attributes: { entry } },
      ResponseMetadata: { RequestId: requestId },
    };
    return AwsXmlFormat.jsonToXML('GetTopicAttributesResponse', json);
  }

  static listSubscriptionsResult(requestId: string, subscriptions: Array<Subscription>, skip: number, total: number): string {
    const json: Record<string, unknown> = {
      ListSubscriptionsResult: {
        Subscriptions: {
          member: subscriptions.map((subscription: Subscription) => ({
            Protocol: subscription.protocol,
            Endpoint: subscription.endPoint,
            SubscriptionArn: this.getSubscriptionARN(subscription),
            TopicArn: subscription.topicARN,
          })),
        },
      },
      ResponseMetadata: { RequestId: requestId },
    };
    if ((skip + subscriptions.length) < total) {
      (json.ListSubscriptionsResult as { NextToken: string }).NextToken = Buffer
        .from(JSON.stringify({ skip: skip + subscriptions.length })).toString('base64');
    }
    return AwsXmlFormat.jsonToXML('ListSubscriptionsResponse', json);
  }

  static listSubscriptionsByTopicResult(requestId: string, subscriptions: Array<Subscription>, skip: number, total: number): string {
    const json: Record<string, unknown> = {
      ListSubscriptionsByTopicResult: {
        Subscriptions: {
          member: subscriptions.map((subscription: Subscription) => ({
            Protocol: subscription.protocol,
            Endpoint: subscription.endPoint,
            SubscriptionArn: this.getSubscriptionARN(subscription),
            TopicArn: subscription.topicARN,
          })),
        },
      },
      ResponseMetadata: { RequestId: requestId },
    };
    if ((skip + subscriptions.length) < total) {
      (json.ListSubscriptionsByTopicResult as { NextToken: string }).NextToken = Buffer
        .from(JSON.stringify({ skip: skip + subscriptions.length })).toString('base64');
    }
    return AwsXmlFormat.jsonToXML('ListSubscriptionsByTopicResponse', json);
  }

  static getSubscriptionARN(subscription: Subscription, ReturnSubscriptionArn?: boolean): string {
    return subscription.confirmed || ReturnSubscriptionArn ? subscription.arn : 'PendingConfirmation';
  }

  private static transformNameValueArrayToMap(input: Array<{ Name: string; Value: MessageAttributeValue; }> = []): MessageAttributeMap {
    return input.reduce((result_: MessageAttributeMap, item: { Name: string; Value: MessageAttributeValue; }) => {
      const result = result_;
      result[item.Name] = item.Value;
      return result;
    }, {});
  }
}

export { AwsXmlFormat };
