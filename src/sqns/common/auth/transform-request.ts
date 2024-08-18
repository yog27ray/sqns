import { Request } from 'express';
import { ExpressMiddleware } from '../../../../typings/express';
import { MessageAttributeEntry } from '../../../client/types';

const MapFields: Array<{ from: string; to: string; }> = [
  { from: 'tags', to: 'Tag' },
  { from: 'Attributes', to: 'Attribute' },
  { from: 'MessageAttributes', to: 'MessageAttribute' },
  { from: 'MessageSystemAttributes', to: 'MessageSystemAttribute' },
  { from: 'AttributeNames', to: 'AttributeName' },
  { from: 'MessageAttributeNames', to: 'MessageAttributeName' },
];

function transformMapFields(_data: Record<string, unknown>): void {
  const data = _data;
  MapFields.forEach((each: { from: string; to: string; }) => {
    if (!data[each.from]) {
      return;
    }
    data[each.to] = data[each.from];
    delete data[each.from];
  });
}

export function transformSqsRequest(): ExpressMiddleware {
  return (req: Request & { sqnsBaseURL: string }, res, next) => {
    req.sqnsBaseURL = `${req.headers['x-forwarded-proto'] as string || req.protocol}://${req.get('host')}${req.baseUrl}`;
    const [, , region]: Array<string> = req.header('Authorization').split(' ')[1].split('=')[1].split('/');
    Object.assign(req.body, { region });
    transformMapFields(req.body as Record<string, unknown>);
    if (req.body.SendMessageBatchRequestEntry) {
      req.body.SendMessageBatchRequestEntry.forEach((each: Record<string, unknown>) => transformMapFields(each));
    }
    if (req.body.QueueUrl) {
      req.body.QueueName = req.body.QueueUrl.split('/').pop();
    }
    next();
  };
}

export function transformSnsRequest(): ExpressMiddleware {
  return (req: Request & { sqnsBaseURL: string }, res, next) => {
    req.sqnsBaseURL = `${req.headers['x-forwarded-proto'] as string || req.protocol}://${req.get('host')}${req.baseUrl}`;
    const [, , region]: Array<string> = req.header('Authorization').split(' ')[1].split('=')[1].split('/');
    Object.assign(req.body, { region });
    if (req.body.Attributes) {
      const attributes = Object.keys(req.body.Attributes)
        .reduce((result, key) => {
          result.push({ key, value: req.body.Attributes[key] });
          return result;
        }, [] as Array<{ key: string; value: string; }>);
      Object.assign(req.body, { Attributes: { entry: attributes } });
    }
    if (req.body.MessageAttributes) {
      const attributes = Object.keys(req.body.MessageAttributes)
        .reduce((result, key) => {
          result.push({ Name: key, Value: req.body.MessageAttributes[key] });
          return result;
        }, [] as Array<MessageAttributeEntry>);
      Object.assign(req.body, { MessageAttributes: { entry: attributes } });
    }
    next();
  };
}
