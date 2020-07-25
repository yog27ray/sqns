import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import xml2js from 'xml2js';
import { EventItem } from '../../../index';
import { Queue } from '../event-manager/queue';

class AwsXmlFormat {
  static errorResponse(code: string, message: string, details?: string): string {
    const builder = new xml2js.Builder({ rootName: 'ErrorResponse' });
    const errorJSON = {
      Error: {
        Type: 'Sender',
        Code: code,
        Message: message,
        Detail: details,
      },
      RequestId: 'cdd49001-ea49-5cbd-b098-c74c65559f22',
    };
    return builder.buildObject(errorJSON) as string;
  }

  static createQueue(host: string, queue: string): string {
    const builder = new xml2js.Builder({ rootName: 'CreateQueueResponse' });
    const json = {
      CreateQueueResult: { QueueUrl: AwsXmlFormat.generateSQSURL(queue, host) },
      ResponseMetadata: { RequestId: '29637ffb-6ecd-54d0-8313-28b470a7bdf1' },
    };
    return builder.buildObject(json) as string;
  }

  static getQueueURL(host: string, queue: string): string {
    const builder = new xml2js.Builder({ rootName: 'GetQueueURLResponse' });
    const json = {
      GetQueueUrlResult: { QueueUrl: AwsXmlFormat.generateSQSURL(queue, host) },
      ResponseMetadata: { RequestId: '29637ffb-6ecd-54d0-8313-28b470a7bdf1' },
    };
    return builder.buildObject(json) as string;
  }

  static deleteQueue(): string {
    const builder = new xml2js.Builder({ rootName: 'DeleteQueueResponse' });
    const json = { ResponseMetadata: { RequestId: '29637ffb-6ecd-54d0-8313-28b470a7bdf1' } };
    return builder.buildObject(json) as string;
  }

  static listQueues(host: string, queues: Array<Queue>): string {
    const builder = new xml2js.Builder({ rootName: 'ListQueuesResponse' });
    const json = {
      ListQueuesResult: { QueueUrl: queues.map((queue: Queue) => AwsXmlFormat.generateSQSURL(queue.name, host)) },
      ResponseMetadata: { RequestId: 'bf4e3b3d-6019-59fe-a3fd-6c7090c8f0a9' },
    };
    return builder.buildObject(json) as string;
  }

  static sendMessage(requestId: string, event: EventItem): string {
    const builder = new xml2js.Builder({ rootName: 'SendMessageResponse' });
    const json = {
      SendMessageResult: AwsXmlFormat.generateSendMessageResponse(event),
      ResponseMetadata: { RequestId: requestId },
    };
    return builder.buildObject(json) as string;
  }

  static generateSendMessageResponse(event: EventItem): { [key: string]: any } {
    return {
      MessageId: event.id,
      MD5OfMessageBody: AwsXmlFormat.md5Hash(event.MessageBody),
      MD5OfMessageAttributes: AwsXmlFormat.md5HashJSON(event.MessageAttribute),
    };
  }

  static sendMessageBatch(requestId: string, events: Array<EventItem>, batchIds: Array<string>): string {
    const builder = new xml2js.Builder({ rootName: 'SendMessageBatchResponse' });
    const eventsResponse = events.map((event: any) => AwsXmlFormat.generateSendMessageResponse(event));
    eventsResponse.forEach((each: any, index: number) => {
      Object.assign(each, { Id: batchIds[index] });
    });
    const json = {
      SendMessageBatchResult: { SendMessageBatchResultEntry: eventsResponse },
      ResponseMetadata: { RequestId: requestId },
    };
    return builder.buildObject(json) as string;
  }

  static receiveMessage(requestId: string, messages: Array<any>, AttributeName: Array<string>, MessageAttributeName: Array<string>)
    : string {
    const builder = new xml2js.Builder({ rootName: 'ReceiveMessageResponse' });
    const json: any = {
      ResponseMetadata: { RequestId: requestId },
      ReceiveMessageResult: {
        Message: messages.map((message: any) => AwsXmlFormat.responseMessage(message, AttributeName, MessageAttributeName)),
      },
    };
    return builder.buildObject(json) as string;
  }

  private static responseMessage(event: EventItem, AttributeName: Array<string>, MessageAttributeName: Array<string>)
    : { [key: string]: any } {
    const result: { [key: string]: any } = {
      MessageId: event.id,
      ReceiptHandle: uuid(),
      MD5OfBody: AwsXmlFormat.md5Hash(event.MessageBody),
      Body: event.MessageBody,
    };
    if (MessageAttributeName) {
      const attributeFields = Object.keys(event.MessageAttribute)
        .filter((each: string) => MessageAttributeName.includes('ALL') || MessageAttributeName.includes(each));
      result.MessageAttribute = attributeFields.map((key: string) => ({ Name: key, Value: event.MessageAttribute[key] }));
    }
    if (AttributeName) {
      const eventSystemAttribute: { [key: string]: any } = {};
      Object.keys(event.MessageSystemAttribute)
        .forEach((key: string) => {
          eventSystemAttribute[key] = event.MessageSystemAttribute[key].StringValue;
        });
      const attributes = {
        ...eventSystemAttribute,
        SenderId: event.queueId,
        ApproximateFirstReceiveTimestamp: `${event.firstSentTime.getTime()}`,
        ApproximateReceiveCount: `${event.receiveCount}`,
        SentTimestamp: `${event.sentTime.getTime()}`,
      };
      const attributeFields = Object.keys(attributes)
        .filter((each: string) => AttributeName.includes('ALL') || AttributeName.includes(each));
      result.Attribute = attributeFields.map((key: string) => ({ Name: key, Value: attributes[key] }));
    }
    return result;
  }

  private static md5HashJSON(json: { [key: string]: any } = {}): string {
    const message = Object.keys(json).sort().map((key: string) => `${key}=${encodeURIComponent(json[key])}`).join('&');
    return AwsXmlFormat.md5Hash(message);
  }

  private static md5Hash(message: string = ''): string {
    return crypto.createHash('md5').update(message).digest('hex');
  }

  private static generateSQSURL(queueName: string, baseURL: string): string {
    return `${baseURL}/sqs/queue/${queueName}`;
  }
}

export { AwsXmlFormat };
