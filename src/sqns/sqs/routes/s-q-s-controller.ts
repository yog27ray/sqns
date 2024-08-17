import { Request, Response } from 'express';
import { ExpressMiddleware } from '../../../../typings/express';
import { EventItem, SendMessageReceived, SQNSError, SQSServerBody } from '../../../client';
import { SQSServerJSONBody } from '../../../client/types/queue';
import { AwsToServerTransformer } from '../../common/auth/aws-to-server-transformer';
import { AwsXmlFormat } from '../../common/auth/aws-xml-format';
import { SQNSErrorCreator } from '../../common/auth/s-q-n-s-error-creator';
import { RESERVED_QUEUE_NAME } from '../../common/helper/common';
import { ResponseHelper } from '../../common/helper/response-helper';
import { Queue } from '../../common/model/queue';
import { User } from '../../common/model/user';
import { ExpressHelper } from '../../common/routes/express-helper';
import { SQSManager } from '../manager/s-q-s-manager';
import { SendMessageJsonReceived } from '../../../client/types/send-message';

class SQSController {
  private readonly _eventManager: SQSManager;

  constructor(eventManager: SQSManager) {
    this._eventManager = eventManager;
  }

  get eventManager(): SQSManager {
    return this._eventManager;
  }

  eventFailure(): ExpressMiddleware {
    return ExpressHelper.requestHandler(async (
      req: Request & { serverBody: { failureMessage: string }; user: User },
      res: Response): Promise<any> => {
      const { queueName, eventId, region } = req.params;
      const failureResponse = req.serverBody.failureMessage || 'Event marked failed without response.';
      const queue = await this.eventManager.getQueue(Queue.arn(req.user.organizationId, region, queueName));
      await this.eventManager.updateEventStateFailure(queue, eventId, failureResponse);
      res.status(200).send(AwsXmlFormat.jsonToXML('Response', { message: 'updated' }));
    });
  }

  eventSuccess(): ExpressMiddleware {
    return ExpressHelper.requestHandler(async (
      req: Request & { serverBody: { successMessage: string }; user: User },
      res: Response): Promise<any> => {
      const { queueName, eventId, region } = req.params;
      const successResponse = req.serverBody.successMessage || 'Event marked success without response.';
      const queue = await this.eventManager.getQueue(Queue.arn(req.user.organizationId, region, queueName));
      await this.eventManager.updateEventStateSuccess(queue, eventId, successResponse);
      res.status(200).send(AwsXmlFormat.jsonToXML('Response', { message: 'updated' }));
    });
  }

  async createQueue(
    user: User,
    QueueName: string,
    region: string,
    attribute: Record<string, string>,
    tag: Record<string, string>): Promise<Queue> {
    let queue = await this.eventManager.getQueue(Queue.arn(user.organizationId, region, QueueName))
      .catch((): Queue => undefined);
    if (!queue) {
      queue = await this.eventManager.createQueue(user, QueueName, region, attribute, tag);
    }
    return queue;
  }

  createQueueHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SQSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const { QueueName, region, Attribute, Tag, requestId } = req.body;
      const queue = await this.createQueue(req.user, QueueName, region, Attribute, Tag);
      res.json(ResponseHelper.createQueue(requestId, req.sqnsBaseURL, queue));
    });
  }

  createMessageHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SQSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const {
        QueueName,
        MessageBody,
        MessageAttribute,
        DelaySeconds,
        MessageDeduplicationId,
        MessageSystemAttribute,
        region,
        requestId,
      } = req.body;
      const queue = await this.eventManager.getQueue(Queue.arn(req.user.organizationId, region, QueueName));
      const event = await this.eventManager.sendMessage(
        queue,
        MessageBody,
        MessageAttribute,
        MessageSystemAttribute,
        DelaySeconds,
        MessageDeduplicationId);
      res.json(ResponseHelper.sendMessage(requestId, event));
    });
  }

  createMessageBatchHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SQSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const { QueueName, SendMessageBatchRequestEntry, requestId, region } = req.body;
      const batchIds = SendMessageBatchRequestEntry.map((each: { Id: string }) => each.Id);
      const queue = await this.eventManager.getQueue(Queue.arn(req.user.organizationId, region, QueueName));
      const events = await Promise.all(SendMessageBatchRequestEntry
        .map((sendMessageReceived: SendMessageJsonReceived) => this.eventManager.sendMessage(
          queue,
          sendMessageReceived.MessageBody,
          sendMessageReceived.MessageAttribute,
          sendMessageReceived.MessageSystemAttribute,
          sendMessageReceived.DelaySeconds,
          sendMessageReceived.MessageDeduplicationId)));
      res.json(ResponseHelper.sendMessageBatch(requestId, events, batchIds));
    });
  }

  receiveMessageHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SQSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const {
        MaxNumberOfMessages,
        VisibilityTimeout,
        AttributeName,
        MessageAttributeName,
        QueueName,
        requestId,
        region,
      } = req.body;
      const queue = await this.eventManager.getQueue(Queue.arn(req.user.organizationId, region, QueueName));
      const events = await this.eventManager.receiveMessage(queue, VisibilityTimeout, MaxNumberOfMessages);
      res.send(ResponseHelper.receiveMessage(requestId, events, AttributeName, MessageAttributeName));
    });
  }

  findMessageByIdHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SQSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const { QueueName, region, MessageId, requestId } = req.body;
      const queue = await this.eventManager.getQueue(Queue.arn(req.user.organizationId, region, QueueName));
      const eventItem = await this.eventManager.findMessageById(queue, MessageId);
      res.send(ResponseHelper.findMessageById(requestId, eventItem));
    });
  }

  findMessageByDuplicationIdHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SQSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const { QueueName, region, MessageDeduplicationId, requestId } = req.body;
      const queue = await this.eventManager.getQueue(Queue.arn(req.user.organizationId, region, QueueName));
      const eventItem = await this.eventManager.findMessageByDeduplicationId(queue, MessageDeduplicationId);
      res.send(ResponseHelper.findMessageById(requestId, eventItem));
    });
  }

  updateMessageByIdHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SQSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const {
        MessageId,
        QueueName,
        DelaySeconds,
        State,
        region,
        requestId,
      } = req.body;
      const queue = await this.eventManager.getQueue(Queue.arn(req.user.organizationId, region, QueueName));
      const eventItem = await this.eventManager.findMessageById(queue, MessageId);
      eventItem.setState(State);
      eventItem.setDelaySeconds(DelaySeconds);
      await this.eventManager.updateEvent(queue, eventItem);
      res.send(ResponseHelper.findMessageById(requestId, eventItem));
    });
  }

  updateMessageByDuplicationIdHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SQSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const {
        MessageDeduplicationId,
        QueueName,
        DelaySeconds,
        State,
        region,
        ReceiveCount,
        requestId,
      } = req.body;
      const queue = await this.eventManager.getQueue(Queue.arn(req.user.organizationId, region, QueueName));
      const eventItem = await this.eventManager.findMessageByDeduplicationId(queue, MessageDeduplicationId);
      eventItem.setReceiveCount(ReceiveCount);
      eventItem.setState(State);
      eventItem.setDelaySeconds(DelaySeconds);
      await this.eventManager.updateEvent(queue, eventItem);
      res.send(ResponseHelper.findMessageById(requestId, eventItem));
    });
  }

  listQueueHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SQSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const { requestId, QueueNamePrefix, region } = req.body;
      const queues = await this.eventManager.listQueues(Queue.arn(req.user.organizationId, region, QueueNamePrefix || ''));
      res.json(ResponseHelper.listQueues(requestId, req.sqnsBaseURL, queues));
    });
  }

  deleteQueueHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SQSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const { QueueName, region, requestId } = req.body;
      if (RESERVED_QUEUE_NAME.includes(QueueName)) {
        SQNSErrorCreator.reservedQueueNames();
      }
      const queue = await this.eventManager.getQueue(Queue.arn(req.user.organizationId, region, QueueName));
      await this.eventManager.deleteQueue(queue);
      res.json(ResponseHelper.deleteQueue(requestId));
    });
  }

  getQueueUrlHandler(): ExpressMiddleware {
    return ExpressHelper.requestHandlerJSON(async (
      req: Omit<Request, 'body'> & { body: SQSServerJSONBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<void> => {
      const { QueueName, region, requestId } = req.body;
      const queue = await this.eventManager.getQueue(Queue.arn(req.user.organizationId, region, QueueName));
      res.json(ResponseHelper.getQueueURL(requestId, req.sqnsBaseURL, queue));
    });
  }

  sqs(): ExpressMiddleware {
    return ExpressHelper.requestHandler(async (
      req: Request & { serverBody: SQSServerBody; user: User; sqnsBaseURL: string },
      res: Response): Promise<any> => {
      switch (req.body.Action) {
        case 'CreateQueue': {
          const { QueueName, region, Attribute, Tag, requestId } = req.serverBody;
          const queue = await this.createQueue(
            req.user,
            QueueName,
            region,
            AwsToServerTransformer.transformArrayToJSON(Attribute),
            AwsToServerTransformer.transformArrayToJSON(Tag));
          return res.send(AwsXmlFormat.createQueue(requestId, req.sqnsBaseURL, queue));
        }
        case 'GetQueueUrl': {
          const { QueueName, region, requestId } = req.serverBody;
          const queue = await this.eventManager.getQueue(Queue.arn(req.user.organizationId, region, QueueName));
          return res.send(AwsXmlFormat.getQueueURL(requestId, req.sqnsBaseURL, queue));
        }
        case 'DeleteQueue': {
          const { queueName, region, requestId } = req.serverBody;
          if (RESERVED_QUEUE_NAME.includes(queueName)) {
            SQNSErrorCreator.reservedQueueNames();
          }
          const queue = await this.eventManager.getQueue(Queue.arn(req.user.organizationId, region, queueName));
          await this.eventManager.deleteQueue(queue);
          return res.send(AwsXmlFormat.deleteQueue(requestId));
        }
        case 'ListQueues': {
          const { requestId, QueueNamePrefix, region } = req.serverBody;
          const queues = await this.eventManager.listQueues(Queue.arn(req.user.organizationId, region, QueueNamePrefix || ''));
          return res.send(AwsXmlFormat.listQueues(requestId, req.sqnsBaseURL, queues));
        }
        case 'SendMessageBatch': {
          const { queueName, SendMessageBatchRequestEntry, requestId, region } = req.serverBody;
          const batchIds = SendMessageBatchRequestEntry.map((each: { Id: string }) => each.Id);
          const queue = await this.eventManager.getQueue(Queue.arn(req.user.organizationId, region, queueName));
          const events = await this.sendMessageBatch(queue, SendMessageBatchRequestEntry);
          return res.send(AwsXmlFormat.sendMessageBatch(requestId, events, batchIds));
        }
        case 'SendMessage': {
          const {
            queueName,
            MessageBody,
            MessageAttribute,
            DelaySeconds,
            MessageDeduplicationId,
            MessageSystemAttribute,
            region,
          } = req.serverBody;
          const queue = await this.eventManager.getQueue(Queue.arn(req.user.organizationId, region, queueName));
          const event = await this.sendMessage(
            queue,
            {
              MessageBody,
              MessageAttribute,
              DelaySeconds,
              MessageDeduplicationId,
              MessageSystemAttribute,
            });
          return res.send(AwsXmlFormat.sendMessage(req.serverBody.requestId, event));
        }
        case 'FindMessageById': {
          const { queueName, region, MessageId, requestId } = req.serverBody;
          const queue = await this.eventManager.getQueue(Queue.arn(req.user.organizationId, region, queueName));
          const eventItem = await this.eventManager.findMessageById(queue, MessageId);
          return res.send(AwsXmlFormat.findMessageById(requestId, eventItem));
        }
        case 'FindMessageByDeduplicationId': {
          const { queueName, region, MessageDeduplicationId, requestId } = req.serverBody;
          const queue = await this.eventManager.getQueue(Queue.arn(req.user.organizationId, region, queueName));
          const eventItem = await this.eventManager.findMessageByDeduplicationId(queue, MessageDeduplicationId);
          return res.send(AwsXmlFormat.findMessageByDeduplicationId(requestId, eventItem));
        }
        case 'UpdateMessageById': {
          const {
            MessageId,
            queueName,
            DelaySeconds,
            State,
            region,
            requestId,
          } = req.serverBody;
          const queue = await this.eventManager.getQueue(Queue.arn(req.user.organizationId, region, queueName));
          const eventItem = await this.eventManager.findMessageById(queue, MessageId);
          eventItem.setState(State);
          eventItem.setDelaySeconds(DelaySeconds);
          await this.eventManager.updateEvent(queue, eventItem);
          return res.send(AwsXmlFormat.updateMessageById(requestId, eventItem));
        }
        case 'UpdateMessageByDeduplicationId': {
          const {
            MessageDeduplicationId,
            queueName,
            DelaySeconds,
            State,
            region,
            ReceiveCount,
            requestId,
          } = req.serverBody;
          const queue = await this.eventManager.getQueue(Queue.arn(req.user.organizationId, region, queueName));
          const eventItem = await this.eventManager.findMessageByDeduplicationId(queue, MessageDeduplicationId);
          eventItem.setReceiveCount(ReceiveCount);
          eventItem.setState(State);
          eventItem.setDelaySeconds(DelaySeconds);
          await this.eventManager.updateEvent(queue, eventItem);
          return res.send(AwsXmlFormat.updateMessageByDeduplicationId(requestId, eventItem));
        }
        case 'ReceiveMessage': {
          const {
            MaxNumberOfMessages,
            VisibilityTimeout,
            AttributeName,
            MessageAttributeName,
            queueName,
            requestId,
            region,
          } = req.serverBody;
          const queue = await this.eventManager.getQueue(Queue.arn(req.user.organizationId, region, queueName));
          const events = await this.eventManager.receiveMessage(queue, VisibilityTimeout, MaxNumberOfMessages);
          return res.send(AwsXmlFormat.receiveMessage(requestId, events, AttributeName, MessageAttributeName));
        }
        default:
          throw new SQNSError({ code: 'Unhandled function', message: 'This function is not supported.' });
      }
    });
  }

  eventStats(): ExpressMiddleware {
    return ExpressHelper.requestHandler((req, res): Promise<any> => {
      if (req.query.format === 'prometheus') {
        res.send(this.eventManager.prometheus());
        return Promise.resolve();
      }
      res.json(this.eventManager.eventStats);
      return Promise.resolve();
    });
  }

  private async sendMessage(queue: Queue, sendMessageReceived: SendMessageReceived): Promise<EventItem> {
    return this.eventManager.sendMessage(
      queue,
      sendMessageReceived.MessageBody,
      AwsToServerTransformer.transformArrayToJSON(sendMessageReceived.MessageAttribute),
      AwsToServerTransformer.transformArrayToJSON(sendMessageReceived.MessageSystemAttribute),
      sendMessageReceived.DelaySeconds,
      sendMessageReceived.MessageDeduplicationId);
  }

  private async sendMessageBatch(queue: Queue, entries: Array<SendMessageReceived>): Promise<Array<EventItem>> {
    const entry = entries.pop();
    if (!entry) {
      return [];
    }
    const events = await this.sendMessageBatch(queue, entries);
    const event = await this.sendMessage(queue, entry);
    events.push(event);
    return events;
  }
}

export { SQSController };
