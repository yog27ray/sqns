import { v4 as uuid } from 'uuid';
import { Queue } from '../model/queue';
import { Encryption, EventItem } from '../../../client';
import { ResponseMessage } from '../../../../typings/response-item';

declare type Return<T> = { data: T; ResponseMetadata: { RequestId: string; }; };
export class ResponseHelper {
  private static send<T>(
    requestId: string, responseValue: T): Return<T> {
    return {
      data: responseValue,
      ResponseMetadata: { RequestId: requestId },
    };
  }

  static createQueue(requestId: string, host: string, queue: Queue): Return<{ QueueUrl: string }> {
    return ResponseHelper.send(requestId, { QueueUrl: ResponseHelper.generateSQSURL(queue, host) });
  }

  static generateSQSURL(queue: Queue, baseURL: string): string {
    return `${baseURL}/sqs/${queue.region}/${queue.companyId}/${queue.name}`;
  }

  static sendMessage(requestId: string, event: EventItem): Return<{ MessageId: string; MD5OfMessageBody: string; MD5OfMessageAttributes: string; }> {
    return ResponseHelper.send(
      requestId,
      {
        MessageId: event.id,
        MD5OfMessageBody: Encryption.createHash('md5', event.MessageBody),
        MD5OfMessageAttributes: Encryption.createJSONHash('md5', event.MessageAttribute),
      });
  }

  static receiveMessage(
    requestId: string,
    events: Array<EventItem>,
    AttributeName: Array<string>,
    MessageAttributeName: Array<string>): Return<{}> {
    return ResponseHelper.send(
      requestId,
      {
        Messages: events
          .map((message: EventItem) => ResponseHelper.responseMessage(message, AttributeName, MessageAttributeName))
          .filter((each) => each),
      });
  }

  static responseMessage(event: EventItem, AttributeName: Array<string>, MessageAttributeName: Array<string>)
    : ResponseMessage {
    if (!event) {
      return undefined;
    }
    const result: ResponseMessage = {
      MessageId: event.id,
      ReceiptHandle: uuid(),
      MD5OfBody: Encryption.createHash('md5', event.MessageBody),
      Body: event.MessageBody,
    };
    if (MessageAttributeName) {
      const attributeFields = Object.keys(event.MessageAttribute)
        .filter((each: string) => MessageAttributeName.includes('ALL') || MessageAttributeName.includes(each));
      result.MessageAttribute = attributeFields.map((key: string) => ({ Name: key, Value: event.MessageAttribute[key] }));
    }
    if (AttributeName) {
      const eventSystemAttribute: Record<string, unknown> = {};
      Object.keys(event.MessageSystemAttribute)
        .forEach((key: string) => {
          eventSystemAttribute[key] = event.MessageSystemAttribute[key].StringValue;
        });
      const attributes = {
        ...eventSystemAttribute,
        SenderId: event.queueARN,
        ApproximateFirstReceiveTimestamp: event.firstSentTime ? `${event.firstSentTime.getTime()}` : '-1',
        ApproximateReceiveCount: `${event.receiveCount}`,
        SentTimestamp: event.sentTime ? `${event.sentTime.getTime()}` : '-1',
      };
      const attributeFields = Object.keys(attributes)
        .filter((each: string) => AttributeName.includes('ALL') || AttributeName.includes(each));
      result.Attribute = attributeFields.map((key: string) => ({ Name: key, Value: attributes[key] }));
    }
    return result;
  }
}
