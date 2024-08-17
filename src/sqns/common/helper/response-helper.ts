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

  static deleteQueue(requestId: string): Return<undefined> {
    return ResponseHelper.send(requestId, undefined);
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

  private static send<T>(
    requestId: string, responseValue: T): Return<T> {
    return {
      data: responseValue,
      ResponseMetadata: { RequestId: requestId },
    };
  }
}
