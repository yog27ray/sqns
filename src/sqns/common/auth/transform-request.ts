import { ExpressMiddleware } from '../../../../typings/express';
import { Request } from 'express';

const MapFields: Array<{ from: string; to: string; }> = [
  { from: 'tags', to: 'Tag' },
  { from: 'Attributes', to: 'Attribute' },
  { from: 'MessageAttributes', to: 'MessageAttribute' },
  { from: 'MessageSystemAttributes', to: 'MessageSystemAttribute' },
];
export function transformRequest(): ExpressMiddleware {
  return (req: Request & { sqnsBaseURL: string }, res, next) => {
    req.sqnsBaseURL = `${req.headers['x-forwarded-proto'] as string || req.protocol}://${req.get('host')}${req.baseUrl}`;
    const [, , region]: Array<string> = req.header('Authorization').split(' ')[1].split('=')[1].split('/');
    req.body.region = region;
    MapFields.forEach((each) => {
      if (!req.body[each.from]) {
        return;
      }
      req.body[each.to] = req.body[each.from];
      delete req.body[each.from];
    });
    if (req.body.QueueUrl) {
      req.body.QueueName = req.body.QueueUrl.split('/').pop();
    }
    next();
    // {
    //   Action: 'SendMessage',
    //     MessageAttribute: [
    //   { Name: 'name', Value: [Object] },
    //   { Name: 'type', Value: [Object] }
    // ],
    //   MessageBody: '123',
    //   MessageDeduplicationId: 'uniqueId1',
    //   MessageSystemAttribute: [ { Name: 'attribute1', Value: [Object] } ],
    //   QueueUrl: 'http://127.0.0.1:1234/api/sqs/sqns/1/queue1',
    //   requestId: '990cf424-3792-4298-9a3f-35b80a2b7980',
    //   region: 'sqns',
    //   queueName: 'queue1'
    // }
  }
}
