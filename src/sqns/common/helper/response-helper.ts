import { v4 as uuid } from 'uuid';
import { ResponseMessageJson } from '../../../../typings/response-item';
import { Encryption, EventItem, MessageAttributeValue } from '../../../client';
import { Publish } from '../model/publish';
import { Queue } from '../model/queue';
import { Subscription } from '../model/subscription';
import { Topic } from '../model/topic';

declare interface Return<T> { data: T; ResponseMetadata: { RequestId: string; }; }

export class ResponseHelper {
  static createTopic(requestId: string, topic: Topic): Return<{ TopicArn: string }> {
    return ResponseHelper.send(requestId, { TopicArn: topic.arn });
  }

  static getTopicAttributes(requestId: string, topic: Topic): Return<{ Attributes: Record<string, string>; }> {
    const attributes: Record<string, string> = topic.attributes.entry
      .filter((each: { key: string, value: string }) => !['DeliveryPolicy'].includes(each.key))
      .reduce((result: Record<string, string>, each: { key: string, value: string }) => ({
        ...result,
        [each.key]: each.value,
      }), {
        SubscriptionsPending: '0',
        SubscriptionsConfirmed: '0',
        SubscriptionsDeleted: '0',
        TopicArn: topic.arn,
        EffectiveDeliveryPolicy: JSON.stringify(topic.deliveryPolicy),
      });
    return ResponseHelper.send(requestId, { Attributes: attributes });
  }

  static listTopic(
    requestId: string,
    topics: Array<Topic>,
    skip: number,
    total: number): Return<{ Topics: unknown; NextToken?: string; }> {
    const result: { Topics: unknown; NextToken?: string; } = {
      Topics: topics.map((topic: Topic) => ({ TopicArn: topic.arn })),
    };
    if ((skip + topics.length) < total) {
      result.NextToken = Encryption.encodeNextToken({ skip: skip + topics.length });
    }
    return ResponseHelper.send(requestId, result);
  }

  static createQueue(requestId: string, host: string, queue: Queue): Return<{ QueueUrl: string }> {
    return ResponseHelper.send(requestId, { QueueUrl: ResponseHelper.generateSQSURL(queue, host) });
  }

  static generateSQSURL(queue: Queue, baseURL: string): string {
    return `${baseURL}/sqs/${queue.region}/${queue.companyId}/${queue.name}`;
  }

  static sendMessage(
    requestId: string,
    event: EventItem): Return<{ MessageId: string; MD5OfMessageBody: string; MD5OfMessageAttributes: string; }> {
    return ResponseHelper.send(
      requestId,
      {
        MessageId: event.id,
        MD5OfMessageBody: Encryption.createHash('md5', event.MessageBody),
        MD5OfMessageAttributes: Encryption.createJSONHash('md5', event.MessageAttribute),
      });
  }

  static sendMessageBatch(
    requestId: string,
    events: Array<EventItem>,
    batchIds: Array<string>): Return<Array<{ Id: string; MessageId: string; MD5OfMessageBody: string; MD5OfMessageAttributes: string; }>> {
    const eventsResponse: Array<{
      Id: string;
      MessageId: string;
      MD5OfMessageBody: string;
      MD5OfMessageAttributes: string;
    }> = events.map((event: EventItem) => ({
      Id: '-',
      MessageId: event.id,
      MD5OfMessageBody: Encryption.createHash('md5', event.MessageBody),
      MD5OfMessageAttributes: Encryption.createJSONHash('md5', event.MessageAttribute),
    }));
    eventsResponse.forEach((each: unknown, index: number) => {
      Object.assign(each, { Id: batchIds[index] });
    });
    return ResponseHelper.send(requestId, eventsResponse);
  }

  static getQueueURL(requestId: string, host: string, queue: Queue): Return<{ QueueUrl: string; }> {
    return ResponseHelper.send(requestId, { QueueUrl: ResponseHelper.generateSQSURL(queue, host) });
  }

  static success(requestId: string): Return<{ message: 'success' }> {
    return ResponseHelper.send(requestId, { message: 'success' });
  }

  static publish(requestId: string, publish: Publish): Return<{ MessageId: string; }> {
    return ResponseHelper.send(requestId, { MessageId: publish.id });
  }

  static subscribe(requestId: string, subscription: Subscription, returnSubscriptionArn: boolean): Return<{ SubscriptionArn: string; }> {
    return ResponseHelper.send(requestId, { SubscriptionArn: ResponseHelper.getSubscriptionARN(subscription, returnSubscriptionArn) });
  }

  static getSubscription(
    requestId: string,
    host: string,
    subscription: Subscription): Return<Record<string, unknown>> {
    return ResponseHelper.send(requestId, {
      Protocol: subscription.protocol,
      EndPoint: subscription.endPoint,
      Attributes: subscription.Attributes.entry.reduce((result, each) => ({
        ...result,
        [each.key]: each.value,
      }), {}),
      TopicARN: subscription.topicARN,
      ARN: subscription.arn,
      UnsubscribeUrl: subscription.getUnSubscribeURL(host),
    });
  }

  static listSubscriptionsResult(
    requestId: string,
    subscriptions: Array<Subscription>,
    skip: number,
    total: number): Return<{ Subscriptions: Array<Record<string, unknown>>; NextToken?: string; }> {
    const result: { Subscriptions: Array<Record<string, unknown>>; NextToken?: string; } = {
      Subscriptions: subscriptions.map((subscription: Subscription) => ({
        Protocol: subscription.protocol,
        Endpoint: subscription.endPoint,
        SubscriptionArn: ResponseHelper.getSubscriptionARN(subscription),
        TopicArn: subscription.topicARN,
      })),
    };
    if ((skip + subscriptions.length) < total) {
      result.NextToken = Encryption.encodeNextToken({ skip: skip + subscriptions.length });
    }
    return ResponseHelper.send(requestId, result);
  }

  static getPublish(requestId: string, publish: Publish): Return<Record<string, unknown>> {
    const publishJSON: Record<string, unknown> = {
      MessageId: publish.id,
      MessageAttributes: (publish.MessageAttributes.entry || []).reduce((result, item) => ({
        ...result,
        [item.Name]: item.Value,
      }), {}),
      PublishArn: publish.destinationArn,
    };
    ['Message', 'PhoneNumber', 'Subject', 'MessageStructure', 'Status'].forEach((key: string) => {
      if (publish[key]) {
        publishJSON[key] = publish[key];
      }
    });
    return ResponseHelper.send(requestId, publishJSON);
  }

  static listQueues(requestId: string, host: string, queues: Array<Queue>): Return<{ QueueUrls: Array<string>; }> {
    return ResponseHelper.send(
      requestId,
      {
        QueueUrls: queues.map((queue: Queue) => ResponseHelper.generateSQSURL(queue, host)),
      });
  }

  static findMessageById(requestId: string, eventItem: EventItem): Return<{ Message: ResponseMessageJson; }> {
    const message = ResponseHelper.responseMessage(eventItem, ['ALL'], ['ALL']);
    if (message) {
      message.State = eventItem.state;
      message.EventTime = eventItem.originalEventTime.toISOString();
    }
    return ResponseHelper.send(requestId, { Message: message });
  }

  static receiveMessage(
    requestId: string,
    events: Array<EventItem>,
    AttributeName: Array<string>,
    MessageAttributeName: Array<string>): Return<{ Messages: Array<ResponseMessageJson>; }> {
    return ResponseHelper.send(
      requestId,
      {
        Messages: events
          .map((message: EventItem) => ResponseHelper.responseMessage(message, AttributeName, MessageAttributeName))
          .filter((each: ResponseMessageJson) => each),
      });
  }

  static send<T>(
    requestId: string, responseValue: T): Return<T> {
    return {
      data: responseValue,
      ResponseMetadata: { RequestId: requestId },
    };
  }

  static getSubscriptionARN(subscription: Subscription, returnSubscriptionArn?: boolean): string {
    return subscription.confirmed || returnSubscriptionArn ? subscription.arn : 'PendingConfirmation';
  }

  private static responseMessage(_event: EventItem, AttributeName: Array<string>, MessageAttributeName: Array<string>)
    : ResponseMessageJson {
    const event = _event;
    if (!event) {
      return undefined;
    }
    const result: ResponseMessageJson = {
      MessageId: event.id,
      ReceiptHandle: uuid(),
      MD5OfBody: Encryption.createHash('md5', event.MessageBody),
      Body: event.MessageBody,
    };
    if (MessageAttributeName) {
      const messageAttributeKeys = Object.keys(event.MessageAttribute);
      if (messageAttributeKeys.length) {
        Object.keys(event.MessageAttribute).forEach((key: string) => {
          if (MessageAttributeName.includes('ALL') || MessageAttributeName.includes(key)) {
            return;
          }
          delete event.MessageAttribute[key];
        });
        result.MessageAttributes = event.MessageAttribute;
      }
    }
    if (AttributeName) {
      const attributes: Record<string, MessageAttributeValue> = {
        ...event.MessageSystemAttribute,
        SenderId: { DataType: 'String', StringValue: event.queueARN },
        ApproximateFirstReceiveTimestamp: {
          DataType: 'String',
          StringValue: event.firstSentTime ? `${event.firstSentTime.getTime()}` : '-1',
        },
        ApproximateReceiveCount: { DataType: 'String', StringValue: `${event.receiveCount}` },
        SentTimestamp: {
          DataType: 'String',
          StringValue: event.sentTime ? `${event.sentTime.getTime()}` : '-1',
        },
      };
      const finalAttributes = Object.keys(attributes).reduce((result: Record<string, string>, key: string) => {
        if (AttributeName.includes('ALL') || AttributeName.includes(key)) {
          return { ...result, [key]: attributes[key].StringValue };
        }
        return result;
      }, {});
      if (Object.keys(finalAttributes).length) {
        result.Attributes = finalAttributes;
      }
    }
    return result;
  }
}
