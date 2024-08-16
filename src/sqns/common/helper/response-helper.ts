import { v4 as uuid } from 'uuid';
import { ResponseMessage, ResponseMessageJson } from '../../../../typings/response-item';
import { Encryption, EventItem, MessageAttributeValue } from '../../../client';
import { Queue } from '../model/queue';

declare interface Return<T> { data: T; ResponseMetadata: { RequestId: string; }; }

export class ResponseHelper {
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

  static receiveMessage(
    requestId: string,
    events: Array<EventItem>,
    AttributeName: Array<string>,
    MessageAttributeName: Array<string>): Return<{ Messages: Array<ResponseMessage>; }> {
    return ResponseHelper.send(
      requestId,
      {
        Messages: events
          .map((message: EventItem) => ResponseHelper.responseMessage(message, AttributeName, MessageAttributeName))
          .filter((each: ResponseMessage) => each),
      });
  }

  private static responseMessage(event: EventItem, AttributeName: Array<string>, MessageAttributeName: Array<string>)
    : ResponseMessageJson {
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
      Object.keys(event.MessageAttribute).forEach((key) => {
        if (MessageAttributeName.includes('ALL') || MessageAttributeName.includes(key)) {
          return;
        }
        delete event.MessageAttribute[key];
      });
      result.MessageAttributes = event.MessageAttribute;
    }
    if (AttributeName) {
      const attributes: Record<string, MessageAttributeValue> = {
        ...event.MessageSystemAttribute,
        SenderId: { DataType: 'String', StringValue: event.queueARN },
        ApproximateFirstReceiveTimestamp: {
          DataType: 'String',
          StringValue: event.firstSentTime ? `${event.firstSentTime.getTime()}` : '-1',
        } ,
        ApproximateReceiveCount: { DataType: 'String', StringValue: `${event.receiveCount}` },
        SentTimestamp: {
          DataType: 'String',
          StringValue: event.sentTime ? `${event.sentTime.getTime()}` : '-1',
        },
      };
      result.Attributes = Object.keys(attributes).reduce((result: Record<string, string>, key: string) => {
        if (AttributeName.includes('ALL') || AttributeName.includes(key)) {
          result[key] = attributes[key].StringValue;
        }
        return result;
      }, {});
    }
    return result;
  }

  private static send<T>(
    requestId: string, responseValue: T): Return<T> {
    return {
      data: responseValue,
      ResponseMetadata: { RequestId: requestId },
    };
  }
}
