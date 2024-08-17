import { Request } from 'express';
import { ExpressMiddleware } from '../../../../typings/express';

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

export function transformRequest(): ExpressMiddleware {
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
    // {
    //   Action: 'SendMessageBatch',
    //     QueueUrl: 'http://127.0.0.1:1234/api/sqs/sqns/1/queue1',
    //   SendMessageBatchRequestEntry: [
    //   {
    //     Id: '1',
    //     MessageAttribute: [ { Name: 'Priority', Value: [Object] }, [length]: 1 ],
    //   MessageBody: 'PriorityTest'
    // },
    //   {
    //     Id: '2',
    //       MessageAttribute: [ { Name: 'Priority', Value: [Object] }, [length]: 1 ],
    //     MessageBody: 'PriorityTest'
    //   },
    //   {
    //     Id: '3',
    //       MessageAttribute: [ { Name: 'Priority', Value: [Object] }, [length]: 1 ],
    //     MessageBody: 'PriorityTest'
    //   },
    //   {
    //     Id: '4',
    //       MessageAttribute: [ { Name: 'Priority', Value: [Object] }, [length]: 1 ],
    //     MessageBody: 'PriorityTest'
    //   },
    //   {
    //     Id: '5',
    //       MessageAttribute: [ { Name: 'Priority', Value: [Object] }, [length]: 1 ],
    //     MessageBody: 'PriorityTest'
    //   },
    //   [length]: 5
    // ],
    //   requestId: 'cb467bba-5451-452f-b5a8-31c7735f0ca7',
    //     region: 'sqns',
    //   queueName: 'queue1'
    // }
  };
}
