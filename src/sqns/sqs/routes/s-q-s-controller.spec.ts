import { expect } from 'chai';
import moment from 'moment/moment';
import { CreateQueueResult } from '../../../../typings/queue';
import { delay, dropDatabase } from '../../../setup';
import { Env } from '../../../test-env';
import { signRequest } from '../../common/auth/authentication';
import { BaseClient } from '../../common/client/base-client';
import { RequestClient } from '../../common/request-client/request-client';
import { SQNSClient } from '../../s-q-n-s-client';

const requestClient = new RequestClient();

describe('EventManagerMasterSpec', () => {
  context('errorHandling', () => {
    let client: SQNSClient;
    before(async () => {
      await dropDatabase();
      client = new SQNSClient({
        endpoint: `${Env.URL}/api`,
        accessKeyId: 'invalidKey',
        secretAccessKey: 'invalidAccessKey',
      });
    });

    it('should give error when client credentials are wrong.', async () => {
      try {
        await client.createQueue({ QueueName: 'queue1' });
        await Promise.reject({ code: 99, message: 'should not reach here.' });
      } catch ({ code, message }) {
        expect({ code, message }).to.deep.equal({
          code: 'SignatureDoesNotMatch',
          message: 'The request signature we calculated does not match the signature you provided.',
        });
      }
    });

    it('should give error when client credentials are wrong for listQueues.', async () => {
      try {
        await client.listQueues({});
        await Promise.reject({ code: 99, message: 'should not reach here.' });
      } catch ({ code, message }) {
        expect({ code, message }).to.deep.equal({
          code: 'SignatureDoesNotMatch',
          message: 'The request signature we calculated does not match the signature you provided.',
        });
      }
    });

    it('should give error when authentication header is missing.', async () => {
      try {
        await requestClient.post(`${Env.URL}/api/sqs`, {
          body: JSON.stringify({ Action: 'AddPermission' }),
        });
        await Promise.reject({ code: 99, message: 'should not reach here.' });
      } catch ({ code, message }) {
        expect({ code, message }).to.deep.equal({
          code: '400',
          message: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            + '<ErrorResponse>\n'
            + '  <RequestId/>\n'
            + '  <Error>\n'
            + '    <Type>Sender</Type>\n'
            + '    <Code>SignatureDoesNotMatch</Code>\n'
            + '    <Message>The request signature we calculated does not match the signature you provided.</Message>\n'
            + '    <Detail/>\n'
            + '  </Error>\n'
            + '</ErrorResponse>',
        });
      }
    });

    it('should give error when authentication header is inValid.', async () => {
      try {
        await requestClient.post(`${Env.URL}/api/sqs`, {
          body: JSON.stringify({ Action: 'AddPermission' }),
          headers: { authorization: '' },
        });
        await Promise.reject({ code: 99, message: 'should not reach here.' });
      } catch ({ code, message }) {
        expect({ code, message }).to.deep.equal({
          code: '400',
          message: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            + '<ErrorResponse>\n'
            + '  <RequestId/>\n'
            + '  <Error>\n'
            + '    <Type>Sender</Type>\n'
            + '    <Code>SignatureDoesNotMatch</Code>\n'
            + '    <Message>The request signature we calculated does not match the signature you provided.</Message>\n'
            + '    <Detail/>\n'
            + '  </Error>\n'
            + '</ErrorResponse>',
        });
      }
    });

    it('should give error function is not supported.', async () => {
      try {
        const request = {
          headers: {
            'x-sqns-date': moment().utc().format('YYYYMMDDTHHmmss'),
            host: '127.0.0.1:1234',
          },
          body: { Action: 'AddPermission' },
        };
        signRequest(
          {
            service: 'sqs',
            region: BaseClient.REGION,
            headers: request.headers,
            originalUrl: '/api/sqs',
            method: 'POST',
            body: request.body,
          },
          { accessKeyId: Env.accessKeyId, secretAccessKey: Env.secretAccessKey },
          ['x-sqns-date', 'host', 'x-sqns-content-sha256']);
        await requestClient.post(`${Env.URL}/api/sqs`, {
          body: JSON.stringify(request.body),
          headers: request.headers,
        });
        await Promise.reject({ code: 99, message: 'should not reach here.' });
      } catch ({ code, message }) {
        expect({ code, message }).to.deep.equal({
          code: '400',
          message: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            + '<ErrorResponse>\n'
            + '  <RequestId/>\n'
            + '  <Error>\n'
            + '    <Type>Sender</Type>\n'
            + '    <Code>Unhandled function</Code>\n'
            + '    <Message>This function is not supported.</Message>\n'
            + '    <Detail/>\n'
            + '  </Error>\n'
            + '</ErrorResponse>',
        });
      }
    });
  });

  context('eventStats', () => {
    let client: SQNSClient;
    let queue1: CreateQueueResult;
    let queue2: CreateQueueResult;
    before(async () => {
      await dropDatabase();
      client = new SQNSClient({
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
      });
      queue1 = await client.createQueue({ QueueName: 'queue1' });
      queue2 = await client.createQueue({ QueueName: 'queue2' });
      await client.sendMessageBatch({
        QueueUrl: queue1.QueueUrl,
        Entries: [{ Id: '123', MessageBody: 'type1' }, { Id: '1234', MessageBody: 'type2' }],
      });
      await client.sendMessageBatch({
        QueueUrl: queue2.QueueUrl,
        Entries: [
          { Id: '123', MessageBody: 'type1' },
          { Id: '1234', MessageBody: 'type2' },
          { Id: '1224', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '1', DataType: 'String' } } },
        ],
      });
      await delay();
    });

    it('should return current event status', async () => {
      const stats = await requestClient.get(`${Env.URL}/api/queues/events/stats`, true);
      expect(stats).to.deep.equal({
        PRIORITY_TOTAL: 5,
        'arn:sqns:sqs:sqns:1:queue1': { PRIORITY_TOTAL: 2, PRIORITY_999999: 2 },
        PRIORITY_999999: 4,
        'arn:sqns:sqs:sqns:1:queue2': { PRIORITY_TOTAL: 3, PRIORITY_999999: 2, PRIORITY_1: 1 },
        PRIORITY_1: 1,
      });
    });

    it('should return current event status in prometheus format', async () => {
      const stats = await requestClient.get(`${Env.URL}/api/queues/events/stats?format=prometheus`) as string;
      const statsWithoutTimeStamp = stats.split('\n').map((each: string) => {
        const words = each.split(' ');
        words.pop();
        return words.join(' ');
      }).join('\n');
      expect(statsWithoutTimeStamp).to.deep.equal('arn_sqns_sqs_sqns_1_queue1_queue_priority{label="PRIORITY_999999"} 2\n'
        + 'arn_sqns_sqs_sqns_1_queue1_queue_priority{label="PRIORITY_TOTAL"} 2\n'
        + 'arn_sqns_sqs_sqns_1_queue2_queue_priority{label="PRIORITY_1"} 1\n'
        + 'arn_sqns_sqs_sqns_1_queue2_queue_priority{label="PRIORITY_999999"} 2\n'
        + 'arn_sqns_sqs_sqns_1_queue2_queue_priority{label="PRIORITY_TOTAL"} 3\n'
        + 'queue_priority{label="PRIORITY_1"} 1\n'
        + 'queue_priority{label="PRIORITY_999999"} 4\n'
        + 'queue_priority{label="PRIORITY_TOTAL"} 5\n');
    });

    it('should preserve all priority with zero', async () => {
      await requestClient.get(`${Env.URL}/api/queues/events/stats?format=prometheus`);
      await client.receiveMessage({ QueueUrl: queue1.QueueUrl, MaxNumberOfMessages: 10 });
      await client.receiveMessage({ QueueUrl: queue2.QueueUrl, MaxNumberOfMessages: 10 });
      const stats = await requestClient.get(`${Env.URL}/api/queues/events/stats?format=prometheus`) as string;
      const statsWithoutTimeStamp = stats.split('\n').map((each: string) => {
        const words = each.split(' ');
        words.pop();
        return words.join(' ');
      }).join('\n');
      expect(statsWithoutTimeStamp).to.deep.equal('arn_sqns_sqs_sqns_1_queue1_queue_priority{label="PRIORITY_999999"} 0\n'
        + 'arn_sqns_sqs_sqns_1_queue1_queue_priority{label="PRIORITY_TOTAL"} 0\n'
        + 'arn_sqns_sqs_sqns_1_queue2_queue_priority{label="PRIORITY_1"} 0\n'
        + 'arn_sqns_sqs_sqns_1_queue2_queue_priority{label="PRIORITY_999999"} 0\n'
        + 'arn_sqns_sqs_sqns_1_queue2_queue_priority{label="PRIORITY_TOTAL"} 0\n'
        + 'queue_priority{label="PRIORITY_1"} 0\n'
        + 'queue_priority{label="PRIORITY_999999"} 0\n'
        + 'queue_priority{label="PRIORITY_TOTAL"} 0\n');
    });
  });

  context('eventPoll', () => {
    let client: SQNSClient;
    let queue: CreateQueueResult;
    beforeEach(async () => {
      await dropDatabase();
      client = new SQNSClient({
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
      });
      queue = await client.createQueue({ QueueName: 'queue2' });
      await client.sendMessageBatch({
        QueueUrl: queue.QueueUrl,
        Entries: [
          { Id: '1234', MessageBody: 'type1' },
          {
            Id: '123',
            MessageBody: 'type2',
            MessageAttributes: { priority: { StringValue: '1', DataType: 'String' } },
          },
          { Id: '1235', MessageBody: 'type1' },
        ],
      });
      await delay();
    });

    it('should return highest priority item', async () => {
      const { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl });
      expect(Messages.length).to.equal(1);
      expect(Messages[0].Body).to.equal('type2');
    });

    it('should return empty error when no event to process.', async () => {
      let { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl });
      expect(Messages.length).to.equal(1);
      ({ Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl }));
      expect(Messages.length).to.equal(1);
      ({ Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl }));
      expect(Messages.length).to.equal(1);
      ({ Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl }));
      expect(Messages.length).to.equal(0);
    });
  });
});
