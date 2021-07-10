import SQS from 'aws-sdk/clients/sqs';
import { expect } from 'chai';
import moment from 'moment';
import nock from 'nock';
import { parseString } from 'xml2js';
import { ChannelDeliveryPolicy } from '../../typings/delivery-policy';
import { Message } from '../../typings/recieve-message';
import {
  ARN,
  ConfirmSubscriptionResponse,
  CreateQueueResult,
  CreateTopicResponse,
  KeyValue,
  SubscriptionConfirmationRequestBody,
  SupportedProtocol,
} from '../../typings/typings';
import { app, delay, dropDatabase, setupConfig } from '../setup';
import { deleteDynamicDataOfResults, Env } from '../test-env';
import { generateAuthenticationHash } from './common/auth/authentication';
import { SQNSError } from './common/auth/s-q-n-s-error';
import { BaseClient } from './common/client/base-client';
import { SYSTEM_QUEUE_NAME } from './common/helper/common';
import { DeliveryPolicyHelper } from './common/helper/delivery-policy-helper';
import { BaseStorageEngine } from './common/model/base-storage-engine';
import { EventItem, EventState } from './common/model/event-item';
import { Queue } from './common/model/queue';
import { User } from './common/model/user';
import { RequestClient } from './common/request-client/request-client';
import { SQNS } from './s-q-n-s';
import { SQNSClient } from './s-q-n-s-client';
import { SQSManager } from './sqs/manager/s-q-s-manager';

describe('SQNSClient', () => {
  describe('SQS', () => {
    context('CreateQueue', () => {
      let client: SQNSClient;
      beforeEach(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
      });

      it('should create queue1', async () => {
        const result = await client.createQueue({
          QueueName: 'queue1',
          Attributes: { attribute: 'attribute1' },
          tags: { tag: 'tag1' },
        });
        expect(result.QueueUrl).to.equal(`${Env.URL}/api/sqs/sqns/1/queue1`);
      });

      it('should return queue url protocol as provided in headers', async () => {
        const result = await new BaseClient('sqs', {
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        }).request({
          uri: `${Env.URL}/api/sqs`,
          body: { Action: 'CreateQueue', QueueName: 'queue1' },
          headers: { 'x-forwarded-proto': 'https' },
        });
        expect(result.CreateQueueResponse.CreateQueueResult.QueueUrl).to
          .equal(`https:${Env.URL.split(':').slice(1).join(':')}/api/sqs/sqns/1/queue1`);
      });

      it('should allow request create same queue multiple times', async () => {
        await client.createQueue({ QueueName: 'queue1' });
        const result = await client.createQueue({ QueueName: 'queue1' });
        expect(result.QueueUrl).to.equal(`${Env.URL}/api/sqs/sqns/1/queue1`);
      });

      it('should receive message maximum of 2 times', async () => {
        const deliveryPolicy: ChannelDeliveryPolicy = JSON.parse(JSON.stringify(DeliveryPolicyHelper
          .DEFAULT_DELIVERY_POLICY.default.defaultHealthyRetryPolicy));
        deliveryPolicy.maxDelayTarget = 0;
        deliveryPolicy.minDelayTarget = 0;
        const queue = await client.createQueue({
          QueueName: 'queue1',
          Attributes: { maxReceiveCount: '2', DeliveryPolicy: JSON.stringify(deliveryPolicy) },
        });
        await client.sendMessage({
          QueueUrl: queue.QueueUrl,
          MessageAttributes: { type: { StringValue: 'type1', DataType: 'String' }, name: { StringValue: 'testUser', DataType: 'String' } },
          MessageSystemAttributes: { attribute1: { StringValue: 'attributeValue', DataType: 'String' } },
          MessageDeduplicationId: 'uniqueId1',
          MessageBody: '123',
        });
        let { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, VisibilityTimeout: 0 });
        expect(Messages.length).to.equal(1);
        ({ Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, VisibilityTimeout: 0 }));
        expect(Messages.length).to.equal(1);
        ({ Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, VisibilityTimeout: 0 }));
        expect(Messages.length).to.equal(0);
      });

      it('should receive message at-least 1 times', async () => {
        const queue = await client.createQueue({ QueueName: 'queue1', Attributes: { maxReceiveCount: '-10' } });
        await client.sendMessage({
          QueueUrl: queue.QueueUrl,
          MessageAttributes: { type: { StringValue: 'type1', DataType: 'String' }, name: { StringValue: 'testUser', DataType: 'String' } },
          MessageSystemAttributes: { attribute1: { StringValue: 'attributeValue', DataType: 'String' } },
          MessageDeduplicationId: 'uniqueId1',
          MessageBody: '123',
        });
        let { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, VisibilityTimeout: 0 });
        expect(Messages.length).to.equal(1);
        ({ Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, VisibilityTimeout: 0 }));
        expect(Messages.length).to.equal(0);
      });
    });

    context('SendMessage', () => {
      let client: SQNSClient;
      let queue: CreateQueueResult;
      beforeEach(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        queue = await client.createQueue({ QueueName: 'queue1' });
      });

      it('should not add two message with same uniqueId in queue1', async () => {
        const result1 = await client.sendMessage({
          QueueUrl: queue.QueueUrl,
          MessageAttributes: { type: { StringValue: 'type1', DataType: 'String' } },
          MessageDeduplicationId: 'uniqueId1',
          MessageBody: '123',
        });
        const result = await client.sendMessage({
          QueueUrl: queue.QueueUrl,
          MessageAttributes: { type: { StringValue: 'type2', DataType: 'String' } },
          MessageDeduplicationId: 'uniqueId1',
          MessageBody: '123',
        });
        expect(result.MD5OfMessageBody).to.equal(result1.MD5OfMessageBody);
        expect(result.MD5OfMessageAttributes).to.equal(result1.MD5OfMessageAttributes);
        expect(result.MessageId).to.equal(result1.MessageId);
        expect(result.MD5OfMessageBody).to.equal('202cb962ac59075b964b07152d234b70');
        expect(result.MD5OfMessageAttributes).to.equal('8bd349963828b39106dd3a35071ccee6');
        expect(result.MessageId).to.exist;
        const { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MaxNumberOfMessages: 10 });
        expect(Messages.length).to.deep.equal(1);
      });

      it('should add system attributes', async () => {
        await client.sendMessage({
          QueueUrl: queue.QueueUrl,
          MessageAttributes: { type: { StringValue: 'type1', DataType: 'String' } },
          MessageSystemAttributes: { attribute1: { StringValue: 'attributeValue', DataType: 'String' } },
          MessageDeduplicationId: 'uniqueId1',
          MessageBody: '123',
        });
        const { Messages } = await client.receiveMessage({
          QueueUrl: queue.QueueUrl,
          AttributeNames: ['ALL'],
          MaxNumberOfMessages: 10,
        });
        expect(Messages.length).to.deep.equal(1);
        expect(Messages[0].Attributes.SenderId).exist;
        expect(Messages[0].Attributes.SentTimestamp).exist;
        expect(Messages[0].Attributes.SentTimestamp).to.equal(Messages[0].Attributes.ApproximateFirstReceiveTimestamp);
        delete Messages[0].Attributes.SenderId;
        delete Messages[0].Attributes.SentTimestamp;
        delete Messages[0].Attributes.ApproximateFirstReceiveTimestamp;
        expect(Messages[0].Attributes).to.deep.equal({ ApproximateReceiveCount: '1', attribute1: 'attributeValue' });
      });

      it('should give error when queue doesn\'t exists.', async () => {
        try {
          await client.sendMessage({ QueueUrl: `${queue.QueueUrl}1`, MessageBody: '123' });
          await Promise.reject({ code: 99, message: 'should not reach here.' });
        } catch (error) {
          expect(error.code).to.equal('NonExistentQueue');
          expect(error.message).to.equal('The specified "queue11" queue does not exist.');
        }
      });

      it('should add new event in the queue1', async () => {
        const result = await client.sendMessage({
          QueueUrl: queue.QueueUrl,
          MessageAttributes: { type: { StringValue: 'type1', DataType: 'String' } },
          MessageDeduplicationId: 'uniqueId1',
          MessageBody: '123',
        });
        expect(result.MD5OfMessageBody).to.equal('202cb962ac59075b964b07152d234b70');
        expect(result.MD5OfMessageAttributes).to.equal('8bd349963828b39106dd3a35071ccee6');
        expect(result.MessageId).to.exist;
      });

      it('should not add same event twice in queue1', async () => {
        let result = await client.sendMessage({
          QueueUrl: queue.QueueUrl,
          MessageAttributes: { type: { StringValue: 'type1', DataType: 'String' } },
          MessageDeduplicationId: 'uniqueId1',
          MessageBody: '123',
        });
        const firstMessageId = result.MessageId;
        result = await client.sendMessage({
          QueueUrl: queue.QueueUrl,
          MessageAttributes: { type: { StringValue: 'type1', DataType: 'String' } },
          MessageDeduplicationId: 'uniqueId1',
          MessageBody: '123',
        });
        expect(firstMessageId).to.equal(result.MessageId);
        const messages = await client.receiveMessage({
          QueueUrl: queue.QueueUrl,
          MaxNumberOfMessages: 10,
          MessageAttributeNames: ['ALL'],
        });
        expect(messages.Messages.length).to.equal(1);
        expect(messages.Messages[0].MessageId).to.equal('uniqueId1');
        expect(messages.Messages[0].ReceiptHandle).to.exist;
        deleteDynamicDataOfResults(messages);
        expect(messages).to.deep.equal({
          Messages: [{
            MD5OfBody: '202cb962ac59075b964b07152d234b70',
            Body: '123',
            MessageAttributes: {
              type: {
                StringValue: 'type1',
                BinaryListValues: [],
                StringListValues: [],
                DataType: 'String',
              },
            },
          }],
        });
      });

      it('should add new event in the queue1 with special characters in MessageAttributes', async () => {
        const result = await client.sendMessage({
          QueueUrl: queue.QueueUrl,
          MessageAttributes: {
            type: { StringValue: 'type1', DataType: 'String' },
            message: {
              DataType: 'String',
              StringValue: 'Hello User, Hope you would have started using the product & comfortable with it.'
                + ' Do let us know if there\'s anything I can do for you by responding to this msg. We will always be there to support'
                + ' you through this process.',
            },
          },
          MessageDeduplicationId: 'uniqueId1',
          MessageBody: '123',
        });
        expect(result.MD5OfMessageBody).to.equal('202cb962ac59075b964b07152d234b70');
        expect(result.MD5OfMessageAttributes).to.equal('2951094a8d0f32172b42c6e00d63a24e');
        expect(result.MessageId).to.exist;
      });
    });

    context('FindMessageById', () => {
      let client: SQNSClient;
      let queue: CreateQueueResult;
      let queue2: CreateQueueResult;
      let messages: Array<Message>;
      beforeEach(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        queue = await client.createQueue({ QueueName: 'queue1' });
        queue2 = await client.createQueue({ QueueName: 'queue2' });
        ({ Successful: messages } = await client.sendMessageBatch({
          QueueUrl: queue.QueueUrl,
          Entries: [
            {
              Id: '123',
              MessageBody: '123',
              MessageAttributes: {
                type: { StringValue: 'type1', DataType: 'String' },
                name: { StringValue: 'testUser', DataType: 'String' },
              },
              MessageSystemAttributes: { attribute1: { StringValue: 'attributeValue', DataType: 'String' } },
              MessageDeduplicationId: 'uniqueId1',
            },
            { Id: '1234', MessageBody: '1234', MessageAttributes: { type: { StringValue: 'type2', DataType: 'String' } } },
            { Id: '1235', MessageBody: '1235' },
          ],
        }));
      });

      it('should find message when messageId is correct.', async () => {
        const { Message } = await client.findByMessageId({
          MessageId: messages[1].MessageId,
          QueueUrl: queue.QueueUrl,
        });
        expect(Message.MessageId).to.equal(messages[1].MessageId);
        expect(Message.Body).to.equal('1234');
        expect(Message.Attributes).to.exist;
        expect(Message.MessageAttributes).to.exist;
        expect(Message.State).to.equal(EventState.PENDING);
      });

      it('should not find message when messageId correct and queueUrl is different.', async () => {
        const { Message } = await client.findByMessageId({
          MessageId: messages[1].MessageId,
          QueueUrl: queue2.QueueUrl,
        });
        expect(Message).to.not.exist;
      });

      it('should not find message when messageId is invalid.', async () => {
        const { Message } = await client.findByMessageId({
          MessageId: 'invalidMessageId',
          QueueUrl: queue.QueueUrl,
        });
        expect(Message).to.not.exist;
      });
    });

    context('UpdateMessageById', () => {
      let client: SQNSClient;
      let queue: CreateQueueResult;
      let queue2: CreateQueueResult;
      let messages: Array<Message>;
      beforeEach(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        queue = await client.createQueue({ QueueName: 'queue1' });
        queue2 = await client.createQueue({ QueueName: 'queue2' });
        ({ Successful: messages } = await client.sendMessageBatch({
          QueueUrl: queue.QueueUrl,
          Entries: [{
            Id: '123',
            MessageBody: '123',
            MessageAttributes: {
              type: { StringValue: 'type1', DataType: 'String' },
              name: { StringValue: 'testUser', DataType: 'String' },
            },
            MessageSystemAttributes: { attribute1: { StringValue: 'attributeValue', DataType: 'String' } },
            MessageDeduplicationId: 'uniqueId1',
          }],
        }));
      });

      it('should update message with time and state.', async () => {
        const { Message: OriginalMessage } = await client.findByMessageId({
          MessageId: messages[0].MessageId,
          QueueUrl: queue.QueueUrl,
        });
        const { Message: UpdatedMessage } = await client.updateMessageById({
          MessageId: messages[0].MessageId,
          QueueUrl: queue.QueueUrl,
          DelaySeconds: 100,
          State: EventState.SUCCESS,
        });
        const { Message } = await client.findByMessageId({
          MessageId: messages[0].MessageId,
          QueueUrl: queue.QueueUrl,
        });
        expect(Message.MessageId).to.equal(OriginalMessage.MessageId);
        expect(Message.Body).to.equal(OriginalMessage.Body);
        expect(Message.State).to.equal('SUCCESS');
        expect(Message.MessageAttributes).to.exist;
        expect(Message.Attributes).to.exist;
        expect(UpdatedMessage.MessageAttributes).to.exist;
        expect(UpdatedMessage.Attributes).to.exist;
        expect(new Date(Message.EventTime).getTime() - new Date(OriginalMessage.EventTime).getTime()).to.be.least(100000);
        expect(new Date(Message.EventTime).getTime() - new Date(OriginalMessage.EventTime).getTime()).to.be.most(101000);
      });

      it('should update message with different state.', async () => {
        await client.updateMessageById({
          MessageId: messages[0].MessageId,
          QueueUrl: queue.QueueUrl,
          State: EventState.SUCCESS,
        });
        let { Message } = await client.findByMessageId({
          MessageId: messages[0].MessageId,
          QueueUrl: queue.QueueUrl,
        });
        expect(Message.State).to.equal('SUCCESS');
        await client.updateMessageById({
          MessageId: messages[0].MessageId,
          QueueUrl: queue.QueueUrl,
          State: EventState.FAILURE,
        });
        ({ Message } = await client.findByMessageId({
          MessageId: messages[0].MessageId,
          QueueUrl: queue.QueueUrl,
        }));
        expect(Message.State).to.equal('FAILURE');
        await client.updateMessageById({
          MessageId: messages[0].MessageId,
          QueueUrl: queue.QueueUrl,
          State: EventState.PENDING,
        });
        ({ Message } = await client.findByMessageId({
          MessageId: messages[0].MessageId,
          QueueUrl: queue.QueueUrl,
        }));
        expect(Message.State).to.equal('PENDING');
        await client.updateMessageById({
          MessageId: messages[0].MessageId,
          QueueUrl: queue.QueueUrl,
          State: EventState.PROCESSING,
        });
        ({ Message } = await client.findByMessageId({
          MessageId: messages[0].MessageId,
          QueueUrl: queue.QueueUrl,
        }));
        expect(Message.State).to.equal('PROCESSING');
      });
    });

    context('ReceiveMessage', () => {
      let client: SQNSClient;
      let queue: CreateQueueResult;
      beforeEach(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        queue = await client.createQueue({ QueueName: 'queue1' });
        await client.sendMessageBatch({
          QueueUrl: queue.QueueUrl,
          Entries: [
            {
              Id: '123',
              MessageBody: '123',
              MessageAttributes: {
                type: { StringValue: 'type1', DataType: 'String' },
                name: { StringValue: 'testUser', DataType: 'String' },
              },
              MessageSystemAttributes: { attribute1: { StringValue: 'attributeValue', DataType: 'String' } },
              MessageDeduplicationId: 'uniqueId1',
            },
            { Id: '1234', MessageBody: '1234' },
            { Id: '1235', MessageBody: '1235' },
          ],
        });
      });

      it('should receive system attribute name ApproximateReceiveCount only', async () => {
        const { Messages } = await client.receiveMessage({
          QueueUrl: queue.QueueUrl,
          AttributeNames: ['ApproximateReceiveCount'],
          MaxNumberOfMessages: 1,
        });
        expect(Messages.length).to.deep.equal(1);
        expect(Messages[0].Attributes.SenderId).not.exist;
        expect(Messages[0].Attributes.SentTimestamp).not.exist;
        expect(Messages[0].Attributes).to.deep.equal({ ApproximateReceiveCount: '1' });
      });

      it('should receive attribute name "name" only', async () => {
        const { Messages } = await client.receiveMessage({
          QueueUrl: queue.QueueUrl,
          MessageAttributeNames: ['name'],
          MaxNumberOfMessages: 1,
        });
        expect(Messages.length).to.deep.equal(1);
        expect(Messages[0].MessageAttributes).to.deep.equal({
          name: {
            StringValue: 'testUser',
            StringListValues: [],
            BinaryListValues: [],
            DataType: 'String',
          },
        });
      });

      it('should resend same message on next receiveMessage call when VisibilityTimeout is zero', async () => {
        await client.receiveMessage({ QueueUrl: queue.QueueUrl, VisibilityTimeout: 0 });
        const { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MaxNumberOfMessages: 1 });
        expect(Messages.length).to.deep.equal(1);
      });

      it('should not send same message on next receiveMessage call when VisibilityTimeout is not zero', async () => {
        await client.receiveMessage({ QueueUrl: queue.QueueUrl, VisibilityTimeout: 10 });
        const { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MaxNumberOfMessages: 10 });
        expect(Messages.length).to.deep.equal(2);
      });

      it('should give error when queue doesn\'t exists.', async () => {
        try {
          await client.receiveMessage({ QueueUrl: `${queue.QueueUrl}1` });
          await Promise.reject({ code: 99, message: 'should not reach here.' });
        } catch (error) {
          expect(error.code).to.equal('NonExistentQueue');
          expect(error.message).to.equal('The specified "queue11" queue does not exist.');
        }
      });

      it('should find one event in the queue1', async () => {
        const { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl });
        expect(Messages.length).to.equal(1);
        expect(Messages[0].MessageId).to.exist;
        expect(Messages[0].ReceiptHandle).to.exist;
        expect(Messages[0].Body).to.exist;
        expect(Messages[0].MD5OfBody).to.exist;
      });

      it('should find two event in the queue1', async () => {
        const { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MaxNumberOfMessages: 2 });
        expect(Messages.length).to.equal(2);
        expect(Messages[0].MessageId).to.exist;
        expect(Messages[0].ReceiptHandle).to.exist;
        expect(Messages[0].Body).to.exist;
        expect(Messages[0].MD5OfBody).to.exist;
        expect(Messages[1].MessageId).to.exist;
        expect(Messages[1].ReceiptHandle).to.exist;
        expect(Messages[1].Body).to.exist;
        expect(Messages[1].MD5OfBody).to.exist;
      });

      it('should find no event in the queue2', async () => {
        const queue2 = await client.createQueue({ QueueName: 'queue2' });
        const { Messages } = await client.receiveMessage({ QueueUrl: queue2.QueueUrl });
        expect(Messages.length).to.equal(0);
      });
    });

    context('sendMessageBatch', () => {
      let client: SQNSClient;
      let queue: SQS.Types.CreateQueueResult;
      before(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        queue = await client.createQueue({ QueueName: 'queue1' });
      });

      it('should give error when queue doesn\'t exists.', async () => {
        try {
          await client.sendMessageBatch({
            QueueUrl: `${queue.QueueUrl}1`,
            Entries: [{ Id: '123', MessageBody: '123' }, { Id: '1234', MessageBody: '1234' }],
          });
          await Promise.reject({ code: 99, message: 'should not reach here.' });
        } catch (error) {
          expect(error.code).to.equal('NonExistentQueue');
          expect(error.message).to.equal('The specified "queue11" queue does not exist.');
        }
      });

      it('should add new events in the queue1', async () => {
        const results = await client.sendMessageBatch({
          QueueUrl: queue.QueueUrl,
          Entries: [{ Id: '123', MessageBody: '123' }, { Id: '1234', MessageBody: '1234' }],
        });
        expect(results.Successful.length).to.equal(2);
        expect(results.Successful[0].Id).to.equal('123');
        expect(results.Successful[0].MD5OfMessageBody).to.equal('202cb962ac59075b964b07152d234b70');
        expect(results.Successful[0].MD5OfMessageAttributes).to.equal('d41d8cd98f00b204e9800998ecf8427e');
        expect(results.Successful[0].MessageId).to.exist;
        expect(results.Successful[1].Id).to.equal('1234');
        expect(results.Successful[1].MD5OfMessageBody).to.equal('81dc9bdb52d04dc20036dbd8313ed055');
        expect(results.Successful[1].MD5OfMessageAttributes).to.equal('d41d8cd98f00b204e9800998ecf8427e');
        expect(results.Successful[1].MessageId).to.exist;
        expect(results.Failed.length).to.equal(0);
      });
    });

    context('listQueues', () => {
      let client: SQNSClient;
      before(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        await client.createQueue({ QueueName: '1queue1' });
        await client.createQueue({ QueueName: '1queue2' });
        await client.createQueue({ QueueName: '2queue3' });
      });

      it('should return list of all queues', async () => {
        const list = await client.listQueues();
        expect(list.QueueUrls).to.deep.equal([
          `${Env.URL}/api/sqs/sqns/1/1queue1`,
          `${Env.URL}/api/sqs/sqns/1/1queue2`,
          `${Env.URL}/api/sqs/sqns/1/2queue3`,
        ]);
      });

      it('should return list of all queues starting with "1q"', async () => {
        const list = await client.listQueues({ QueueNamePrefix: '1q' });
        expect(list.QueueUrls).to.deep.equal([
          `${Env.URL}/api/sqs/sqns/1/1queue1`,
          `${Env.URL}/api/sqs/sqns/1/1queue2`,
        ]);
      });
    });

    context('deleteQueue', () => {
      let client: SQNSClient;
      let queue: SQS.Types.CreateQueueResult;
      before(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        queue = await client.createQueue({ QueueName: 'queue1' });
      });

      it('should give error when deleting system queue.', async () => {
        try {
          await client.deleteQueue({ QueueUrl: `${Env.URL}/api/sqs/${SYSTEM_QUEUE_NAME.SNS}` });
          await Promise.reject({ code: 99, message: 'should not reach here.' });
        } catch (error) {
          const { code, message } = error;
          expect({ code, message }).to.deep.equal({ code: 'ReservedQueueName', message: 'Reserved queue name' });
        }
      });

      it('should give error when queue doesn\'t exists.', async () => {
        try {
          await client.deleteQueue({ QueueUrl: `${Env.URL}/api/sqs/queue11` });
          await Promise.reject({ code: 99, message: 'should not reach here.' });
        } catch (error) {
          expect(error.code).to.equal('NonExistentQueue');
          expect(error.message).to.equal('The specified "queue11" queue does not exist.');
        }
      });

      it('should delete queue queue1', async () => {
        try {
          await client.deleteQueue({ QueueUrl: queue.QueueUrl });
          await client.getQueueUrl({ QueueName: 'queue1' });
          await Promise.reject({ code: 99, message: 'should not reach here.' });
        } catch (error) {
          expect(error.code).to.equal('NonExistentQueue');
          expect(error.message).to.equal('The specified "queue1" queue does not exist.');
        }
      });

      it('should delete fifo queue queue1.fifo', async () => {
        try {
          queue = await client.createQueue({ QueueName: 'queue1.fifo' });
          await client.deleteQueue({ QueueUrl: queue.QueueUrl });
          await client.getQueueUrl({ QueueName: 'queue1.fifo' });
          await Promise.reject({ code: 99, message: 'should not reach here.' });
        } catch (error) {
          expect(error.code).to.equal('NonExistentQueue');
          expect(error.message).to.equal('The specified "queue1.fifo" queue does not exist.');
        }
      });
    });

    context('getQueueUrl', () => {
      let client: SQNSClient;
      let queue: SQS.Types.CreateQueueResult;
      before(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        queue = await client.createQueue({ QueueName: 'queue1' });
      });

      it('should give error when queue doesn\'t exists.', async () => {
        try {
          await client.getQueueUrl({ QueueName: 'queue11' });
          await Promise.reject({ code: 99, message: 'should not reach here.' });
        } catch (error) {
          expect(error.code).to.equal('NonExistentQueue');
          expect(error.message).to.equal('The specified "queue11" queue does not exist.');
        }
      });

      it('should return queue1 url', async () => {
        const result = await client.getQueueUrl({ QueueName: 'queue1' });
        expect(result.QueueUrl).to.equal(`${Env.URL}/api/sqs/sqns/1/queue1`);
      });
    });

    context('markEventSuccess', () => {
      let client: SQNSClient;
      let storageAdapter: BaseStorageEngine;
      let MessageId: string;
      let queue: SQS.Types.CreateQueueResult;
      beforeEach(async () => {
        await dropDatabase();
        storageAdapter = new BaseStorageEngine(setupConfig.sqnsConfig.db);
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        queue = await client.createQueue({ QueueName: 'queue1' });
      });

      it('should mark event success', async () => {
        ({ MessageId } = await client.sendMessage({
          QueueUrl: queue.QueueUrl,
          MessageAttributes: { type: { StringValue: 'type1', DataType: 'String' } },
          MessageDeduplicationId: 'uniqueId1',
          MessageBody: '123',
        }));
        await client.markEventSuccess(MessageId, queue.QueueUrl, 'test success message');
        const event = await setupConfig.mongoConnection.findOne(storageAdapter.getDBTableName('Event'));
        expect(event.state).to.equal('SUCCESS');
        expect(event.successResponse).to.equal('test success message');
      });

      it('should mark event success for event having special character in id', async () => {
        ({ MessageId } = await client.sendMessage({
          QueueUrl: queue.QueueUrl,
          MessageAttributes: { type: { StringValue: 'type1', DataType: 'String' } },
          MessageDeduplicationId: 'uniqueId1|2',
          MessageBody: '123',
        }));
        await client.markEventSuccess(MessageId, queue.QueueUrl, 'test success message');
        const event = await setupConfig.mongoConnection.findOne(storageAdapter.getDBTableName('Event'));
        expect(event.state).to.equal('SUCCESS');
        expect(event.successResponse).to.equal('test success message');
      });
    });

    context('markEventFailure', () => {
      let client: SQNSClient;
      let storageAdapter: BaseStorageEngine;
      let MessageId: string;
      let queue: SQS.Types.CreateQueueResult;
      before(async () => {
        await dropDatabase();
        storageAdapter = new BaseStorageEngine(setupConfig.sqnsConfig.db);
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        queue = await client.createQueue({ QueueName: 'queue1' });
        ({ MessageId } = await client.sendMessage({
          QueueUrl: queue.QueueUrl,
          MessageAttributes: { type: { StringValue: 'type1', DataType: 'String' } },
          MessageDeduplicationId: 'uniqueId1',
          MessageBody: '123',
        }));
      });

      it('should mark event failure', async () => {
        await client.markEventFailure(MessageId, queue.QueueUrl, 'test failure message');
        const event = await setupConfig.mongoConnection.findOne(storageAdapter.getDBTableName('Event'));
        expect(event.state).to.equal('FAILURE');
        expect(event.failureResponse).to.equal('test failure message');
      });
    });

    function getQueueARNFromQueueURL(queueURL: string): ARN {
      const queueURLSplit = queueURL.split('/');
      const queueName = queueURLSplit.pop();
      const companyId = queueURLSplit.pop();
      const region = queueURLSplit.pop();
      return Queue.arn(companyId, region, queueName);
    }

    context('Processing of SQS with comparator function in descending order', () => {
      let client: SQNSClient;
      let queue: CreateQueueResult;
      let queueARN: ARN;
      before(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        queue = await client.createQueue({ QueueName: 'queue1' });
        queueARN = getQueueARNFromQueueURL(queue.QueueUrl);
        setupConfig.sqns.queueComparator(queueARN, (item1: EventItem, item2: EventItem) => (item1.priority > item2.priority));
        await client.sendMessageBatch({
          QueueUrl: queue.QueueUrl,
          Entries: [
            { Id: '1231', MessageBody: 'type1', MessageAttributes: { priority: { StringValue: '100', DataType: 'String' } } },
            { Id: '1232', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '10', DataType: 'String' } } },
            { Id: '1233', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '40', DataType: 'String' } } },
            { Id: '1234', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '20', DataType: 'String' } } },
            { Id: '1235', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '30', DataType: 'String' } } },
            { Id: '1236', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '1', DataType: 'String' } } },
          ],
        });
        await delay();
      });

      it('should process event in descending item with descending comparator function', async () => {
        let { Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] });
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(100);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(40);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(30);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(20);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(10);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(1);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(event).to.not.exist;
      });

      after(() => setupConfig.sqns.queueComparator(queueARN, undefined));
    });

    context('Processing of SQS with comparator function in ascending order', () => {
      let client: SQNSClient;
      let queue: CreateQueueResult;
      let queueARN: ARN;
      before(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        queue = await client.createQueue({ QueueName: 'queue1' });
        queueARN = getQueueARNFromQueueURL(queue.QueueUrl);
        setupConfig.sqns.queueComparator(queueARN, (item1: EventItem, item2: EventItem) => (item1.priority < item2.priority));
        await client.sendMessageBatch({
          QueueUrl: queue.QueueUrl,
          Entries: [
            { Id: '1231', MessageBody: 'type1', MessageAttributes: { priority: { StringValue: '100', DataType: 'String' } } },
            { Id: '1232', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '10', DataType: 'String' } } },
            { Id: '1233', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '40', DataType: 'String' } } },
            { Id: '1234', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '20', DataType: 'String' } } },
            { Id: '1235', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '30', DataType: 'String' } } },
            { Id: '1236', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '1', DataType: 'String' } } },
          ],
        });
        await delay();
      });

      it('should process event in ascending item with ascending comparator function', async () => {
        let { Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] });
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(1);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(10);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(20);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(30);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(40);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(100);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(event).to.not.exist;
      });

      after(() => setupConfig.sqns.queueComparator(queueARN, undefined));
    });

    context('Processing of SQS with comparator function in descending order for fifo', () => {
      let client: SQNSClient;
      let queueARN: string;
      let queue: CreateQueueResult;
      before(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        queue = await client.createQueue({ QueueName: 'queue1.fifo' });
        queueARN = getQueueARNFromQueueURL(queue.QueueUrl);
        setupConfig.sqns.queueComparator(queueARN, (item1: EventItem, item2: EventItem) => (item1.priority > item2.priority));
        await client.sendMessageBatch({
          QueueUrl: queue.QueueUrl,
          Entries: [
            { Id: '1231', MessageBody: 'type1', MessageAttributes: { priority: { StringValue: '100', DataType: 'String' } } },
            { Id: '1232', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '10', DataType: 'String' } } },
            { Id: '1233', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '40', DataType: 'String' } } },
            { Id: '1234', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '20', DataType: 'String' } } },
            { Id: '1235', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '30', DataType: 'String' } } },
            { Id: '1236', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '1', DataType: 'String' } } },
          ],
        });
        await delay();
      });

      it('should process event in descending item with descending comparator function for fifo', async () => {
        let { Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] });
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(1);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(30);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(20);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(40);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(10);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(100);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(event).to.not.exist;
      });

      after(() => setupConfig.sqns.queueComparator(queueARN, undefined));
    });

    context('Processing of SQS with comparator function in ascending order for fifo', () => {
      let client: SQNSClient;
      let queue: CreateQueueResult;
      let queueARN: ARN;
      before(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        queue = await client.createQueue({ QueueName: 'queue1.fifo' });
        queueARN = getQueueARNFromQueueURL(queue.QueueUrl);
        setupConfig.sqns.queueComparator(queueARN, (item1: EventItem, item2: EventItem) => (item1.priority < item2.priority));
        await client.sendMessageBatch({
          QueueUrl: queue.QueueUrl,
          Entries: [
            { Id: '1231', MessageBody: 'type1', MessageAttributes: { priority: { StringValue: '100', DataType: 'String' } } },
            { Id: '1232', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '10', DataType: 'String' } } },
            { Id: '1233', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '40', DataType: 'String' } } },
            { Id: '1234', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '20', DataType: 'String' } } },
            { Id: '1235', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '30', DataType: 'String' } } },
            { Id: '1236', MessageBody: 'type2', MessageAttributes: { priority: { StringValue: '1', DataType: 'String' } } },
          ],
        });
        await delay();
      });

      it('should process event in descending item with ascending comparator function for fifo', async () => {
        let { Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] });
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(1);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(30);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(20);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(40);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(10);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(Number(event.MessageAttributes.priority.StringValue)).to.equal(100);
        ({ Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl, MessageAttributeNames: ['ALL'] }));
        expect(event).to.not.exist;
      });

      after(() => setupConfig.sqns.queueComparator(queueARN, undefined));
    });

    context('ErrorHandling', () => {
      before(async () => dropDatabase());

      it('should give error while secret key ', async () => {
        try {
          const client = new SQNSClient({
            endpoint: `${Env.URL}/api`,
            accessKeyId: Env.accessKeyId,
            secretAccessKey: 'InvalidSecretKey',
          });
          await client.createQueue({ QueueName: 'queue1' });
          await Promise.reject({ code: 99, message: 'Should not reach here.' });
        } catch (error) {
          const { code, message } = error;
          expect({ code, message }).deep.equal({
            code: 'SignatureDoesNotMatch',
            message: 'The request signature we calculated does not match the signature you provided.',
          });
        }
      });
    });

    context('SQNS current status', () => {
      let eventManager: SQSManager;
      let queue: Queue;
      let user: User;

      beforeEach(async () => {
        user = new User({ id: '1234', organizationId: '1' });
        eventManager = new SQSManager({
          endpoint: setupConfig.sqnsConfig.endpoint,
          db: setupConfig.sqnsConfig.db,
          requestTasks: ['https://xyz.abc/success', 'https://xyz.abc/failure'],
        });
        queue = await eventManager.createQueue(user, 'queue1', BaseClient.REGION, {}, {});
        await eventManager.sendMessage(queue, 'messageBody', {}, {});
        eventManager.resetAll(true);
      });

      it('should return current status in prometheus format', async () => {
        const result = eventManager.prometheus(new Date(1000));
        expect(result).to.equal('arn_sqns_sqs_sqns_1_queue1_queue_priority{label="PRIORITY_999999"} 1 1000\n'
          + 'arn_sqns_sqs_sqns_1_queue1_queue_priority{label="PRIORITY_TOTAL"} 1 1000\n'
          + 'queue_priority{label="PRIORITY_999999"} 1 1000\n'
          + 'queue_priority{label="PRIORITY_TOTAL"} 1 1000\n');
      });

      it('should delete the queue and reset the status to initial', async () => {
        const queue2 = await eventManager.createQueue(user, 'queue2', BaseClient.REGION, {}, {});
        await eventManager.sendMessage(queue2, 'messageBody', { priority: { StringValue: '1', DataType: 'String' } }, {});
        expect(eventManager.prometheus(new Date(1000))).to
          .equal('arn_sqns_sqs_sqns_1_queue1_queue_priority{label="PRIORITY_999999"} 1 1000\n'
            + 'arn_sqns_sqs_sqns_1_queue1_queue_priority{label="PRIORITY_TOTAL"} 1 1000\n'
            + 'arn_sqns_sqs_sqns_1_queue2_queue_priority{label="PRIORITY_1"} 1 1000\n'
            + 'arn_sqns_sqs_sqns_1_queue2_queue_priority{label="PRIORITY_TOTAL"} 1 1000\n'
            + 'queue_priority{label="PRIORITY_1"} 1 1000\n'
            + 'queue_priority{label="PRIORITY_999999"} 1 1000\n'
            + 'queue_priority{label="PRIORITY_TOTAL"} 2 1000\n');
        await eventManager.deleteQueue(queue2);
        expect(eventManager.prometheus(new Date(1000))).to
          .equal('arn_sqns_sqs_sqns_1_queue1_queue_priority{label="PRIORITY_999999"} 1 1000\n'
            + 'arn_sqns_sqs_sqns_1_queue1_queue_priority{label="PRIORITY_TOTAL"} 1 1000\n'
            + 'queue_priority{label="PRIORITY_1"} 0 1000\n'
            + 'queue_priority{label="PRIORITY_999999"} 1 1000\n'
            + 'queue_priority{label="PRIORITY_TOTAL"} 1 1000\n');
        await eventManager.deleteQueue(queue);
        expect(eventManager.prometheus(new Date(1000))).to.equal('queue_priority{label="PRIORITY_TOTAL"} 0 1000\n');
      });

      it('should send request to given url for notify no events to process.', async () => {
        await eventManager.poll(queue, 20);
        const result = await eventManager.poll(queue, 20);
        expect(result).to.not.exist;
      });

      it('should not add event in active processing list while adding event.', async () => {
        await eventManager.sendMessage(queue, 'messageBody1', { priority: { StringValue: '2', DataType: 'String' } }, {}, '100');
        await eventManager.sendMessage(queue, 'messageBody2', { priority: { StringValue: '2', DataType: 'String' } }, {}, '100');
        await eventManager.sendMessage(queue, 'messageBody3', { priority: { StringValue: '2', DataType: 'String' } }, {}, '100');
        await eventManager.sendMessage(queue, 'messageBody4', {}, {}, '100');
        await eventManager.sendMessage(queue, 'messageBody5', {}, {}, '100');
        expect(eventManager.eventStats).to.deep.equal({
          PRIORITY_TOTAL: 1,
          PRIORITY_2: 0,
          'arn:sqns:sqs:sqns:1:queue1': { PRIORITY_TOTAL: 1, PRIORITY_2: 0, PRIORITY_999999: 1 },
          PRIORITY_999999: 1,
        });
      });
    });

    context('Queue processing flow', () => {
      let queueServer: SQNS;
      let client: SQNSClient;
      let queue: CreateQueueResult;

      beforeEach(async () => {
        await dropDatabase();
        queueServer = new SQNS({
          endpoint: `http://127.0.0.1:${Env.PORT}/api-queue-processing-flow`,
          adminSecretKeys: [{ accessKey: Env.accessKeyId, secretAccessKey: Env.secretAccessKey }],
          db: setupConfig.sqnsConfig.db,
          sqs: { cronInterval: '*/2 * * * * *' },
        });
        queueServer.registerExpressRoutes(app);
        client = new SQNSClient({
          endpoint: `${Env.URL}/api-queue-processing-flow`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        queue = await client.createQueue({ QueueName: 'processingFlow' });
        await client.sendMessageBatch({
          QueueUrl: queue.QueueUrl,
          Entries: new Array(10).fill(0)
            .map((item: number, index: number) => ({ Id: `${index}`, MessageBody: `Message ${index}`, DelaySeconds: 2 })),
        });
        await delay(6 * 1000);
      });

      it('should add items from storage to queue', async () => {
        const stats = await new RequestClient().get(`${Env.URL}/api-queue-processing-flow/queues/events/stats`, true);
        expect(stats).to.deep.equal({
          PRIORITY_TOTAL: 10,
          PRIORITY_999999: 10,
          'arn:sqns:sqs:sqns:1:processingFlow': { PRIORITY_TOTAL: 10, PRIORITY_999999: 10 },
        });
      });

      after(() => queueServer.cancel());
    });
  });

  describe('SNS', () => {
    context('createTopic', () => {
      let client: SQNSClient;
      beforeEach(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
      });

      it('should create topic', async () => {
        const topicResponse = await client.createTopic({
          Name: 'Topic1',
          Attributes: { DisplayName: 'Topic One' },
          Tags: [{ Key: 'tag1', Value: 'value1' }, { Key: 'tag2', Value: 'value2' }],
        });
        expect(topicResponse.TopicArn).to.exist;
        const [item1, item2, item3, item4, item5, item6] = topicResponse.TopicArn.split(':');
        expect(item1).to.equal('arn');
        expect(item2).to.equal('sqns');
        expect(item3).to.equal('sns');
        expect(item4).to.equal('sqns');
        expect(item5).to.exist;
        expect(item6).to.equal('Topic1');
      });
    });

    context('listTopics', () => {
      let client: SQNSClient;
      beforeEach(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        await Promise.all(new Array(150).fill(0)
          .map((i: any, index: number) => client.createTopic({ Name: `Topic${index}` })));
      });

      it('should list topics with pagination', async () => {
        let listTopicsResponse = await client.listTopics({});
        expect(listTopicsResponse.Topics.length).to.equal(100);
        expect(listTopicsResponse.NextToken).to.exist;
        listTopicsResponse = await client.listTopics({ NextToken: listTopicsResponse.NextToken });
        expect(listTopicsResponse.Topics.length).to.equal(50);
        expect(listTopicsResponse.NextToken).to.not.exist;
      });
    });

    context('getTopicAttributes', () => {
      let client: SQNSClient;
      let topic1ARN: string;

      beforeEach(async () => {
        await delay(1000);
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        topic1ARN = (await client.createTopic({
          Name: 'Topic1',
          Attributes: { DisplayName: 'Topic One' },
          Tags: [{ Key: 'tag1', Value: 'value1' }, { Key: 'tag2', Value: 'value2' }],
        })).TopicArn;
      });

      it('should find topic attributes of topic "Topic1"', async () => {
        const topicAttributesResponse = await client.getTopicAttributes({ TopicArn: topic1ARN });
        expect(topicAttributesResponse.Attributes.SubscriptionsPending).to.equal('0');
        expect(topicAttributesResponse.Attributes.TopicArn).to.equal(topic1ARN);
        expect(topicAttributesResponse.Attributes.EffectiveDeliveryPolicy).to.equal('{"default":{"defaultHealthyRetryPolicy":'
          + '{"numRetries":3,"numNoDelayRetries":0,"minDelayTarget":20,"maxDelayTarget":20,"numMinDelayRetries":0,"numMaxDelayRetries":0,'
          + '"backoffFunction":"exponential"},"disableOverrides":false}}');
        expect(topicAttributesResponse.Attributes.SubscriptionsConfirmed).to.equal('0');
        expect(topicAttributesResponse.Attributes.DisplayName).to.equal('Topic One');
        expect(topicAttributesResponse.Attributes.SubscriptionsDeleted).to.equal('0');
      });

      it('should give error when arn is invalid.', async () => {
        try {
          await client.getTopicAttributes({ TopicArn: 'invalid' });
          await Promise.reject({ code: 99, message: 'should not reach here' });
        } catch (error) {
          const { code, message } = error;
          expect({ code, message }).to.deep.equal({
            code: 'NotFound',
            message: 'Topic does not exist.',
          });
        }
      });
    });

    context('setTopicAttributes', () => {
      let client: SQNSClient;
      let topic1ARN: string;

      beforeEach(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        topic1ARN = (await client.createTopic({
          Name: 'Topic1',
          Attributes: { DisplayName: 'Topic One' },
          Tags: [{ Key: 'tag1', Value: 'value1' }, { Key: 'tag2', Value: 'value2' }],
        })).TopicArn;
      });

      it('should update new attributes', async () => {
        await client.setTopicAttributes({
          AttributeName: 'DisplayName',
          TopicArn: topic1ARN,
          AttributeValue: 'Updated Topic One',
        });
        await client.setTopicAttributes({
          AttributeName: 'NewFieldName',
          TopicArn: topic1ARN,
          AttributeValue: 'New field value',
        });
        const topicAttributesResponse = await client.getTopicAttributes({ TopicArn: topic1ARN });
        expect(topicAttributesResponse.Attributes.DisplayName).to.equal('Updated Topic One');
        expect(topicAttributesResponse.Attributes.NewFieldName).to.equal('New field value');
      });
    });

    context('deleteTopic', () => {
      let topicARN: string;
      let client: SQNSClient;
      beforeEach(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        topicARN = (await client.createTopic({
          Name: 'Topic1',
          Attributes: { DisplayName: 'Topic One' },
          Tags: [{ Key: 'tag1', Value: 'value1' }, { Key: 'tag2', Value: 'value2' }],
        })).TopicArn;
      });

      it('should delete topic', async () => {
        const topicResponse = await client.deleteTopic({ TopicArn: topicARN });
        expect(topicResponse).to.exist;
      });
    });

    context('publish', () => {
      let client: SQNSClient;
      let topic: CreateTopicResponse;
      beforeEach(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        topic = await client.createTopic({ Name: 'Topic1' });
      });

      it('should publish message', async () => {
        const result = await client.publish({
          Message: 'This is message',
          TopicArn: topic.TopicArn,
          TargetArn: topic.TopicArn,
          PhoneNumber: '9999999999',
          Subject: 'Subject',
          MessageAttributes: { key1: { DataType: 'String', StringValue: 'value' } },
        });
        expect(result.MessageId).to.to.exist;
        const queue = await client.createQueue({ QueueName: SYSTEM_QUEUE_NAME.SNS });
        const { Messages: [event] } = await client.receiveMessage({ QueueUrl: queue.QueueUrl });
        expect(event).to.exist;
        expect(event.MessageId).to.exist;
        expect(event.Body).to.equal(`scan_publish_${result.MessageId}`);
      });

      it('should give error when MessageStructure is not supported', async () => {
        try {
          await client.publish({
            Message: 'This is message',
            TopicArn: topic.TopicArn,
            TargetArn: topic.TopicArn,
            PhoneNumber: '9999999999',
            Subject: 'Subject',
            MessageStructure: '{ "unsupported": "x" }',
            MessageAttributes: { key1: { DataType: 'String', StringValue: 'value' } },
          });
          await Promise.reject({ code: 99, message: 'should not reach here.' });
        } catch (error) {
          const { code, message } = error;
          expect({ code, message }).to.deep.equal({
            code: '412',
            message: '"unsupported" is not supported channel.',
          });
        }
      });

      it('should give error when MessageStructure value is not string', async () => {
        try {
          await client.publish({
            Message: 'This is message',
            TopicArn: topic.TopicArn,
            TargetArn: topic.TopicArn,
            PhoneNumber: '9999999999',
            Subject: 'Subject',
            MessageStructure: '{ "default": 1 }',
            MessageAttributes: { key1: { DataType: 'String', StringValue: 'value' } },
          });
          await Promise.reject({ code: 99, message: 'should not reach here.' });
        } catch (error) {
          const { code, message } = error;
          expect({ code, message }).to.deep.equal({
            code: '412',
            message: '"default" value "1" is not string.',
          });
        }
      });
    });

    context('subscribe', () => {
      let client: SQNSClient;
      let topic: CreateTopicResponse;
      beforeEach(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        topic = await client.createTopic({ Name: 'Topic1' });
      });

      it('should give error when protocol is not supported', async () => {
        try {
          await client.subscribe({
            TopicArn: topic.TopicArn,
            Attributes: { key: 'value' },
            Endpoint: 'http://test.sns.subscription/valid',
            Protocol: 'app' as SupportedProtocol,
          });
          await Promise.reject({ code: 99, message: 'should not reach here.' });
        } catch (error) {
          const { code, message } = error;
          expect({ code, message }).to.deep.equal({
            code: 'InvalidParameter',
            message: 'Invalid parameter: Does not support this protocol string: app',
          });
        }
      });

      it('should return subscriptionARN as PendingConfirmation', async () => {
        const result = await client.subscribe({
          TopicArn: topic.TopicArn,
          Attributes: { key: 'value' },
          Endpoint: 'http://test.sns.subscription/valid',
          Protocol: 'http',
        });
        expect(result.SubscriptionArn).to.equal('PendingConfirmation');
      });

      it('should return subscriptionARN when ReturnSubscriptionArn is true', async () => {
        const result = await client.subscribe({
          TopicArn: topic.TopicArn,
          Attributes: { key: 'value' },
          Endpoint: 'http://test.sns.subscription/valid',
          Protocol: 'http',
          ReturnSubscriptionArn: true,
        });
        expect(result.SubscriptionArn.startsWith(`${topic.TopicArn}:`)).to.be.true;
      });
    });

    context('listSubscriptions', () => {
      let topicArn: string;
      let client: SQNSClient;
      beforeEach(async () => {
        await delay(100);
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        topicArn = (await client.createTopic({ Name: 'Topic1' })).TopicArn;
        await Promise.all(new Array(150).fill(0)
          .map((i: any, index: number) => client.subscribe({
            TopicArn: topicArn,
            Attributes: { key: 'value' },
            Endpoint: `http://test.sns.subscription/valid${index}`,
            Protocol: 'http',
          })));
      });

      it('should list subscriptions with pagination', async () => {
        let listSubscriptionsResponse = await client.listSubscriptions({});
        expect(listSubscriptionsResponse.Subscriptions.length).to.equal(100);
        expect(listSubscriptionsResponse.NextToken).to.exist;
        listSubscriptionsResponse = await client.listSubscriptions({ NextToken: listSubscriptionsResponse.NextToken });
        expect(listSubscriptionsResponse.Subscriptions.length).to.equal(50);
        expect(listSubscriptionsResponse.NextToken).to.not.exist;
      });
    });

    context('listSubscriptionsByTopic', () => {
      let topic1Arn: string;
      let topic2Arn: string;
      let client: SQNSClient;
      beforeEach(async () => {
        await dropDatabase();
        await delay(200);
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        topic1Arn = (await client.createTopic({ Name: 'Topic1' })).TopicArn;
        topic2Arn = (await client.createTopic({ Name: 'Topic2' })).TopicArn;
        await Promise.all(new Array(150).fill(0)
          .map((i: any, index: number) => client.subscribe({
            TopicArn: topic1Arn,
            Attributes: { key: 'value' },
            Endpoint: `http://test.sns.subscription/valid${index}`,
            Protocol: 'http',
          })));
        await Promise.all(new Array(49).fill(0)
          .map((i: any, index: number) => client.subscribe({
            TopicArn: topic2Arn,
            Attributes: { key: 'value' },
            Endpoint: `http://test.sns.subscription/valid${index}`,
            Protocol: 'http',
          })));
      });

      it('should list subscriptions for topic', async () => {
        let listTopic1SubscriptionsResponse = await client.listSubscriptionsByTopic({ TopicArn: topic1Arn });
        expect(listTopic1SubscriptionsResponse.Subscriptions.length).to.equal(100);
        expect(listTopic1SubscriptionsResponse.NextToken).to.exist;
        listTopic1SubscriptionsResponse = await client.listSubscriptionsByTopic({
          TopicArn: topic1Arn,
          NextToken: listTopic1SubscriptionsResponse.NextToken,
        });
        expect(listTopic1SubscriptionsResponse.Subscriptions.length).to.equal(50);
        expect(listTopic1SubscriptionsResponse.NextToken).to.not.exist;

        const listTopic2SubscriptionsResponse = await client.listSubscriptionsByTopic({ TopicArn: topic2Arn });
        expect(listTopic2SubscriptionsResponse.Subscriptions.length).to.equal(49);
        expect(listTopic2SubscriptionsResponse.NextToken).to.not.exist;

        let listSubscriptionsResponse = await client.listSubscriptions({});
        expect(listSubscriptionsResponse.Subscriptions.length).to.equal(100);
        expect(listSubscriptionsResponse.NextToken).to.exist;
        listSubscriptionsResponse = await client.listSubscriptions({ NextToken: listSubscriptionsResponse.NextToken });
        expect(listSubscriptionsResponse.Subscriptions.length).to.equal(99);
        expect(listSubscriptionsResponse.NextToken).to.not.exist;
      });
    });

    context('confirmSubscription', () => {
      let client: SQNSClient;
      let topic: CreateTopicResponse;
      beforeEach(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        topic = await client.createTopic({ Name: 'Topic1' });
      });

      it('should give error when Token is invalid.', async () => {
        try {
          await client.confirmSubscription({ Token: 'InvalidToken', TopicArn: 'InvalidTopicArn' });
          await Promise.reject({ code: 99, message: 'should not reach here.' });
        } catch (error) {
          const { code, message } = error;
          expect({ code, message }).to.deep.equal({ code: 'InvalidParameter', message: 'Invalid token' });
        }
      });

      it('should confirm subscription', async () => {
        const promise = new Promise((resolve: (response: ConfirmSubscriptionResponse) => void) => {
          nock('http://test.sns.subscription')
            .persist()
            .post('/valid', () => true)
            // eslint-disable-next-line func-names
            .reply(200, async function (path: string, body: SubscriptionConfirmationRequestBody)
              : Promise<unknown> {
              expect(this.req.headers['x-sqns-sns-message-id'][0]).to.equal(body.MessageId);
              expect(this.req.headers['x-sqns-sns-message-type'][0]).to.equal('SubscriptionConfirmation');
              expect(this.req.headers['x-sqns-sns-topic-arn'][0]).to.equal(topic.TopicArn);
              expect(body.Type).to.equal('SubscriptionConfirmation');
              expect(body.TopicArn).to.equal(topic.TopicArn);
              expect(body.Message).to.equal(`You have chosen to subscribe to the topic ${topic.TopicArn}.\n`
                + 'To confirm the subscription, visit the SubscribeURL included in this message.');
              expect(body.SubscribeURL).to.equal(`${Env.URL}/api/sns?Action=SubscriptionConfirmation&TopicArn=${topic.TopicArn
              }&Token=${body.Token}`);
              expect(body.Token).to.exist;
              expect(body.MessageId).to.exist;
              expect(body.Timestamp).to.exist;
              const result = await client.confirmSubscription({ TopicArn: body.TopicArn, Token: body.Token });
              resolve(result);
              return {};
            });
        });
        const [subscriptionResponse] = await Promise.all([
          promise,
          client.subscribe({
            TopicArn: topic.TopicArn,
            Attributes: { key: 'value' },
            Endpoint: 'http://test.sns.subscription/valid',
            Protocol: 'http',
          }),
        ]);
        expect(subscriptionResponse.SubscriptionArn.startsWith(`${topic.TopicArn}:`)).to.be.true;
        const result = await client.subscribe({
          TopicArn: topic.TopicArn,
          Attributes: { key: 'value' },
          Endpoint: 'http://test.sns.subscription/valid',
          Protocol: 'http',
        });
        expect(result.SubscriptionArn.startsWith(`${topic.TopicArn}:`)).to.be.true;
      });

      it('should confirm subscription via SubscribeURL', async () => {
        const promise = new Promise((resolve: (value?: unknown) => void) => {
          nock('http://test.sns.subscription')
            .persist()
            .post('/valid', () => true)
            .reply(200, async (path: string, body: SubscriptionConfirmationRequestBody) => {
              expect(body.SubscribeURL).to.equal(`${Env.URL}/api/sns?Action=SubscriptionConfirmation&TopicArn=${topic.TopicArn
              }&Token=${body.Token}`);
              await new RequestClient().get(body.SubscribeURL);
              resolve();
              return {};
            });
        });
        await Promise.all([
          promise,
          client.subscribe({
            TopicArn: topic.TopicArn,
            Attributes: { key: 'value' },
            Endpoint: 'http://test.sns.subscription/valid',
            Protocol: 'http',
          }),
        ]);
        const result = await client.subscribe({
          TopicArn: topic.TopicArn,
          Attributes: { key: 'value' },
          Endpoint: 'http://test.sns.subscription/valid',
          Protocol: 'http',
        });
        expect(result.SubscriptionArn.startsWith(`${topic.TopicArn}:`)).to.be.true;
      });

      afterEach(() => nock.cleanAll());
    });

    context('unsubscribe', () => {
      let subscriptionArn: string;
      let topicARN: string;
      let client: SQNSClient;
      beforeEach(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        topicARN = (await client.createTopic({
          Name: 'Topic1',
          Attributes: { DisplayName: 'Topic One' },
          Tags: [{ Key: 'tag1', Value: 'value1' }, { Key: 'tag2', Value: 'value2' }],
        })).TopicArn;
        subscriptionArn = (await client.subscribe({
          TopicArn: topicARN,
          Attributes: { key: 'value' },
          Endpoint: 'http://test.sns.subscription/valid',
          Protocol: 'http',
          ReturnSubscriptionArn: true,
        })).SubscriptionArn;
      });

      it('should unsubscribe subscription', async () => {
        await client.unsubscribe({ SubscriptionArn: subscriptionArn });
        const result = await client.listSubscriptions({});
        expect(result.Subscriptions.length).to.equal(0);
      });

      it('should unsubscribe subscription when topic is deleted', async () => {
        await client.deleteTopic({ TopicArn: topicARN });
        const result = await client.listSubscriptions({});
        expect(result.Subscriptions.length).to.equal(0);
      });
    });

    context('getPublish', () => {
      let client: SQNSClient;
      beforeEach(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
      });

      it('should give error when MessageId is invalid.', async () => {
        try {
          await client.getPublish({ MessageId: 'InvalidMessageId' });
          await Promise.reject({ code: 99, message: 'should not reach here.' });
        } catch (error) {
          const { code, message } = error;
          expect({ code, message }).to.deep.equal({ code: 'NotFound', message: 'Publish does not exist.' });
        }
      });
    });

    context('getSubscription', () => {
      let client: SQNSClient;
      beforeEach(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
      });

      it('should give error when subscription ARN is invalid.', async () => {
        try {
          await client.getSubscription({ SubscriptionArn: 'InvalidSubscriptionARN' });
          await Promise.reject({ code: 99, message: 'should not reach here.' });
        } catch (error) {
          const { code, message } = error;
          expect({ code, message }).to.deep.equal({ code: 'NotFound', message: 'Subscription does not exist.' });
        }
      });
    });

    context('markPublished', () => {
      let storageAdapter: BaseStorageEngine;
      let client: SQNSClient;
      let MessageId: string;

      beforeEach(async () => {
        await dropDatabase();
        storageAdapter = new BaseStorageEngine(setupConfig.sqnsConfig.db);
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
        const topic = await client.createTopic({ Name: 'Topic1' });
        const result = await client.publish({
          Message: 'This is message',
          TopicArn: topic.TopicArn,
          TargetArn: topic.TopicArn,
          PhoneNumber: '9999999999',
          Subject: 'Subject',
          MessageAttributes: { key1: { DataType: 'String', StringValue: 'value' } },
        });
        ({ MessageId } = result);
      });

      it('should mark published when all subscriptions are processed.', async () => {
        await client.markPublished({ MessageId });
        const result = await setupConfig.mongoConnection.findOne(storageAdapter.getDBTableName('Publish'));
        expect(result.Status).to.equal('Published');
      });
    });

    context('error handling', () => {
      const requestClient: RequestClient = new RequestClient();
      async function request(request: { uri: string, method: string, body?: KeyValue, headers?: KeyValue<string> }): Promise<any> {
        const headers = {
          'x-amz-date': moment().utc().format('YYYYMMDDTHHmmss'),
          host: request.uri.split('/')[2],
        };
        const authorization = generateAuthenticationHash({
          service: 'sns',
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
          region: BaseClient.REGION,
          date: headers['x-amz-date'],
          originalUrl: request.uri.split(headers.host)[1],
          host: headers.host,
          method: request.method,
          body: request.body || {},
        });
        request.headers = { ...(request.headers || {}), ...headers, authorization };
        await (request.method === 'GET'
          ? requestClient.get(request.uri)
          : requestClient.post(request.uri, { headers: request.headers, body: JSON.stringify(request.body) }))
          .catch((error: any) => new Promise((resolve: (value: unknown) => void, reject: any) => {
            parseString(error.message, (parserError: any, result: any) => {
              if (parserError) {
                reject(new SQNSError({ code: error.statusCode, message: error.error }));
                return;
              }
              const { Code: [code], Message: [message] } = result.ErrorResponse.Error[0];
              reject(new SQNSError({ code, message }));
            });
          }));
      }

      it('should give error when action is not supported for POST method', async () => {
        try {
          await request({ uri: `${Env.URL}/api/sns`, method: 'POST', body: { Action: 'NotSupportedAction' } });
          await Promise.reject({ code: 99, message: 'should not reach here' });
        } catch (error) {
          const { code, message } = error;
          expect({ code, message }).to.deep.equal({
            code: 'UnhandledFunction',
            message: '"NotSupportedAction" function is not supported.',
          });
        }
      });

      it('should give error when action is not supported for GET method', async () => {
        try {
          await request({ uri: `${Env.URL}/api/sns?Action=NotSupportedAction`, method: 'GET' });
          await Promise.reject({ code: 99, message: 'should not reach here' });
        } catch (error) {
          const { code, message } = error;
          expect({ code, message }).to.deep.equal({
            code: 'UnhandledFunction',
            message: '"NotSupportedAction" function is not supported.',
          });
        }
      });

      it('should handle error when response is not json ', async () => {
        try {
          nock(Env.URL).persist().post('/api/sns', () => true).reply(200, { reply: 'json' });
          const client = new SQNSClient({
            endpoint: `${Env.URL}/api`,
            accessKeyId: Env.accessKeyId,
            secretAccessKey: Env.secretAccessKey,
          });
          await client.getPublish({ MessageId: 'test' });
          await Promise.reject({ code: 99, message: 'should not reach here.' });
        } catch (error) {
          const { code, message } = error;
          expect({ code, message }).to.deep.equal({
            code: 'Error',
            message: 'Non-whitespace before first tag.\nLine: 0\nColumn: 1\nChar: {',
          });
        }
      });

      afterEach(() => nock.cleanAll());
    });

    context('createTopicAttributes', () => {
      let client: SQNSClient;

      beforeEach(async () => {
        await dropDatabase();
        client = new SQNSClient({
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
        });
      });

      async function checkForCreateTopicAttributes(topicARN: string, name: string, deliveryPolicy: string): Promise<void> {
        const topicAttributesResponse = await client.getTopicAttributes({ TopicArn: topicARN });
        expect(topicAttributesResponse.Attributes.SubscriptionsPending).to.equal('0');
        expect(topicAttributesResponse.Attributes.TopicArn).to.equal(topicARN);
        expect(topicAttributesResponse.Attributes.EffectiveDeliveryPolicy).to.equal(deliveryPolicy);
        expect(topicAttributesResponse.Attributes.SubscriptionsConfirmed).to.equal('0');
        expect(topicAttributesResponse.Attributes.DisplayName).to.equal(name);
        expect(topicAttributesResponse.Attributes.SubscriptionsDeleted).to.equal('0');
      }

      it('should set the DeliveryPolicy provided', async () => {
        const topicARN = (await client.createTopic({
          Name: 'TopicDeliveryPolicy',
          Attributes: {
            DisplayName: 'Topic Delivery Policy',
            DeliveryPolicy: '{"default":{"defaultHealthyRetryPolicy":'
              + '{"numRetries":1,"numNoDelayRetries":2,"minDelayTarget":3,"maxDelayTarget":4,"numMinDelayRetries":5,"numMaxDelayRetries":6,'
              + '"backoffFunction":"linear"},"disableOverrides":false}}',
          },
          Tags: [{ Key: 'tag1', Value: 'value1' }, { Key: 'tag2', Value: 'value2' }],
        })).TopicArn;
        await checkForCreateTopicAttributes(topicARN, 'Topic Delivery Policy', '{"default":{"defaultHealthyRetryPolicy":'
          + '{"numRetries":1,"numNoDelayRetries":2,"minDelayTarget":3,"maxDelayTarget":4,"numMinDelayRetries":5,"numMaxDelayRetries":6,'
          + '"backoffFunction":"linear"},"disableOverrides":false}}');
      });

      it('should use the default delivery policy when DeliveryPolicy provided is invalid json', async () => {
        try {
          await client.createTopic({
            Name: 'TopicInvalidJSONDeliveryPolicy',
            Attributes: {
              DisplayName: 'Topic Invalid JSON Delivery Policy',
              DeliveryPolicy: '"http":{"defaultHealthyRetryPolicy":'
                + '{"numRetries":1,"numNoDelayRetries":2,"minDelayTarget":3,"maxDelayTarget":4,"numMinDelayRetries":5,'
                + '"numMaxDelayRetries":6,"backoffFunction":"linear"},"disableOverrides":false}}',
            },
            Tags: [{ Key: 'tag1', Value: 'value1' }, { Key: 'tag2', Value: 'value2' }],
          });
          await Promise.reject({ code: 99, message: 'should not reach here.' });
        } catch (error) {
          const { code, message } = error;
          expect({ code, message }).to.deep.equal({
            code: 'InvalidDeliveryPolicy',
            message: 'Unexpected token : in JSON at position 6',
          });
        }
      });

      it('should use the default delivery policy when DeliveryPolicy provided some filed is missing', async () => {
        try {
          await client.createTopic({
            Name: 'TopicFieldMissingDeliveryPolicy',
            Attributes: {
              DisplayName: 'Topic Field Missing Delivery Policy',
              DeliveryPolicy: '{"default":{"defaultHealthyRetryPolicy":'
                + '{"numNoDelayRetries":2,"minDelayTarget":3,"maxDelayTarget":4,"numMinDelayRetries":5,"numMaxDelayRetries":6,'
                + '"backoffFunction":"linear"},"disableOverrides":false}}',
            },
            Tags: [{ Key: 'tag1', Value: 'value1' }, { Key: 'tag2', Value: 'value2' }],
          });
          await Promise.reject({ code: 99, message: 'should not reach here.' });
        } catch (error) {
          const { code, message } = error;
          expect({ code, message }).to.deep.equal({
            code: 'InvalidDeliveryPolicy',
            message: 'Different keys',
          });
        }
      });

      it('should use the default delivery policy when DeliveryPolicy provided some filed is wrongly named', async () => {
        try {
          await client.createTopic({
            Name: 'TopicFieldMissingDeliveryPolicy',
            Attributes: {
              DisplayName: 'Topic Field Missing Delivery Policy',
              DeliveryPolicy: '{"default":{"defaultHealthyRetryPolicy":'
                + '{"numRetries1":1, "numNoDelayRetries":2,"minDelayTarget":3,"maxDelayTarget":4,"numMinDelayRetries":5,'
                + '"numMaxDelayRetries":6,"backoffFunction":"linear"},"disableSubscriptionOverrides":false}}',
            },
            Tags: [{ Key: 'tag1', Value: 'value1' }, { Key: 'tag2', Value: 'value2' }],
          });
          await Promise.reject({ code: 99, message: 'should not reach here.' });
        } catch (error) {
          const { code, message } = error;
          expect({ code, message }).to.deep.equal({
            code: 'InvalidDeliveryPolicy',
            message: '"numRetries1" missing.',
          });
        }
      });

      it('should use the default delivery policy when DeliveryPolicy provided has unsupported backoffFunction', async () => {
        try {
          await client.createTopic({
            Name: 'TopicFieldMissingDeliveryPolicy',
            Attributes: {
              DisplayName: 'Topic Field Missing Delivery Policy',
              DeliveryPolicy: '{"default":{"defaultHealthyRetryPolicy":'
                + '{"numRetries":1, "numNoDelayRetries":2,"minDelayTarget":3,"maxDelayTarget":4,"numMinDelayRetries":5,'
                + '"numMaxDelayRetries":6,"backoffFunction":"unsupportedBackOffFunction"},"disableOverrides":false}}',
            },
            Tags: [{ Key: 'tag1', Value: 'value1' }, { Key: 'tag2', Value: 'value2' }],
          });
          await Promise.reject({ code: 99, message: 'should not reach here.' });
        } catch (error) {
          const { code, message } = error;
          expect({ code, message }).to.deep.equal({
            code: 'InvalidDeliveryPolicy',
            message: '"unsupportedBackOffFunction" backoffFunction invalid.',
          });
        }
      });
    });
  });
});
