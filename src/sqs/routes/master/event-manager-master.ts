import { Request, Response } from 'express';
import { AwsError } from '../../aws/aws-error';
import { AwsToServerTransformer } from '../../aws/aws-to-server-transformer';
import { AwsXmlFormat } from '../../aws/aws-xml-format';
import { EventItem, EventManager } from '../../event-manager';
import { ExpressHelper, ExpressMiddleware } from './express-helper';

class EventManagerMaster {
  private readonly _eventManager: EventManager;

  constructor(eventManager: EventManager) {
    this._eventManager = eventManager;
  }

  get eventManager(): EventManager {
    return this._eventManager;
  }

  eventFailure(): ExpressMiddleware {
    return ExpressHelper.requestHandler(async (req: Request & { serverBody: any; user: any }, res: Response): Promise<any> => {
      const { queueName, eventId } = req.params;
      const failureResponse = req.serverBody.failureMessage || 'Event marked failed without response.';
      await this.eventManager.updateEventStateFailure(queueName, eventId, failureResponse);
      res.status(200).json({ message: 'updated' });
    });
  }

  eventSuccess(): ExpressMiddleware {
    return ExpressHelper.requestHandler(async (req: Request & { serverBody: any; user: any }, res: Response): Promise<any> => {
      const { queueName, eventId } = req.params;
      const successResponse = req.serverBody.successMessage || 'Event marked success without response.';
      await this.eventManager.updateEventStateSuccess(queueName, eventId, successResponse);
      res.status(200).json({ message: 'updated' });
    });
  }

  sqs(): ExpressMiddleware {
    return ExpressHelper.requestHandler(async (req: Request & { serverBody: any; user: any }, res: Response): Promise<any> => {
      switch (req.body.Action) {
        case 'CreateQueue': {
          const { name } = await this.eventManager.createQueue(
            req.serverBody.QueueName,
            AwsToServerTransformer.transformArrayToJSON(req.serverBody.Attribute),
            AwsToServerTransformer.transformArrayToJSON(req.serverBody.Tag));
          return res.send(AwsXmlFormat.createQueue('http://localhost:1234/api', name));
        }
        case 'GetQueueUrl': {
          const { name } = await this.eventManager.getQueue(req.serverBody.QueueName);
          return res.send(AwsXmlFormat.getQueueURL('http://localhost:1234/api', name));
        }
        case 'DeleteQueue': {
          await this.eventManager.deleteQueue(req.serverBody.queueName);
          return res.send(AwsXmlFormat.deleteQueue());
        }
        case 'ListQueues': {
          const queues = await this.eventManager.listQueues(req.body.QueueNamePrefix);
          return res.send(AwsXmlFormat.listQueues('http://localhost:1234/api', queues));
        }
        case 'SendMessageBatch': {
          const { queueName, SendMessageBatchRequestEntry, requestId } = req.serverBody;
          const batchIds = SendMessageBatchRequestEntry.map((each: any) => each.Id);
          const events = await this.sendMessageBatch(queueName, SendMessageBatchRequestEntry);
          return res.send(AwsXmlFormat.sendMessageBatch(requestId, events, batchIds));
        }
        case 'SendMessage': {
          const event = await this.sendMessage(req.serverBody);
          return res.send(AwsXmlFormat.sendMessage(req.serverBody.requestId, event));
        }
        case 'ReceiveMessage': {
          const { MaxNumberOfMessages, VisibilityTimeout, AttributeName, MessageAttributeName, queueName, requestId } = req.serverBody;
          const queue = await this.eventManager.getQueue(queueName);
          const events = await this.eventManager.receiveMessage(queue, VisibilityTimeout, MaxNumberOfMessages);
          return res.send(AwsXmlFormat.receiveMessage(requestId, events, AttributeName, MessageAttributeName));
        }
        default:
          throw new AwsError({ code: 'Unhandled function', message: 'This function is not supported.' });
      }
    });
  }

  eventStats(): ExpressMiddleware {
    return ExpressHelper.requestHandler((req, res): Promise<any> => {
      if (req.query.format === 'prometheus') {
        res.send(this.eventManager.prometheus);
        return;
      }
      res.json(this.eventManager.eventStats);
    });
  }

  private sendMessage({ queueName, MessageBody, MessageAttribute, DelaySeconds, MessageDeduplicationId, MessageSystemAttribute }: any)
    : Promise<EventItem> {
    return this.eventManager.sendMessage(
      queueName,
      MessageBody,
      AwsToServerTransformer.transformArrayToJSON(MessageAttribute),
      AwsToServerTransformer.transformArrayToJSON(MessageSystemAttribute),
      DelaySeconds,
      MessageDeduplicationId);
  }

  private async sendMessageBatch(queueName: string, entries: Array<EventItem>): Promise<Array<any>> {
    const entry = entries.pop();
    if (!entry) {
      return [];
    }
    const events = await this.sendMessageBatch(queueName, entries);
    const event = await this.sendMessage({ ...entry, queueName });
    events.push(event);
    return events;
  }
}

export { EventManagerMaster };
