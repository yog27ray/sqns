import { expect } from 'chai';
import moment from 'moment';
import nock from 'nock';
import rp from 'request-promise';
import { parseString } from 'xml2js';
import { ConfirmSubscriptionResponse, KeyValue, SubscriptionConfirmationRequestBody, SupportedProtocol } from '../../../typings';
import { delay, dropDatabase } from '../../setup';
import { Env } from '../../test-env';
import { generateAuthenticationHash } from '../common/auth/authentication';
import { SQNSError } from '../common/auth/s-q-n-s-error';
import { SYSTEM_QUEUE_NAME } from '../common/helper/common';
import { RequestClient } from '../common/request-client/request-client';
import { SQSClient } from '../sqs/s-q-s-client';
import { SNSClient } from './s-n-s-client';

describe('SNS', () => {
  context('error handling', () => {
    async function request(request: { uri: string, method: string, body?: KeyValue, headers?: KeyValue }): Promise<any> {
      const headers = {
        'x-amz-date': moment().utc().format('YYYYMMDDTHHmmss'),
        host: request.uri.split('/')[2],
      };
      const authorization = generateAuthenticationHash({
        service: 'sns',
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        region: Env.region,
        date: headers['x-amz-date'],
        originalUrl: request.uri.split(headers.host)[1],
        host: headers.host,
        method: request.method,
        body: request.body || {},
      });
      request.headers = { ...(request.headers || {}), ...headers, authorization };
      await rp({ ...request, json: true })
        .catch((error: any) => new Promise((resolve: (value: unknown) => void, reject: any) => {
          parseString(error.error, (parserError: any, result: any) => {
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
        const client = new SNSClient({
          region: Env.region,
          endpoint: `${Env.URL}/api`,
          accessKeyId: Env.accessKeyId,
          secretAccessKey: Env.secretAccessKey,
          maxRetries: 0,
        });
        await client.getPublish({ MessageId: 'test' });
        await Promise.reject({ code: 99, message: 'should not reach here.' });
      } catch (error) {
        const { code, message } = error;
        expect({ code, message }).to.deep.equal({
          code: 'Error',
          message: 'Non-whitespace before first tag.\nLine: 0\nColumn: 1\nChar: [',
        });
      }
    });

    afterEach(() => nock.cleanAll());
  });

  context('createTopic', () => {
    let client: SNSClient;
    beforeEach(async () => {
      await dropDatabase();
      client = new SNSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
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
      expect(item4).to.equal('testRegion');
      expect(item5).to.exist;
      expect(item6).to.equal('Topic1');
    });
  });

  context('deleteTopic', () => {
    let topicARN: string;
    let client: SNSClient;
    beforeEach(async () => {
      await dropDatabase();
      client = new SNSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
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

  context('listTopics', () => {
    let client: SNSClient;
    beforeEach(async () => {
      await dropDatabase();
      client = new SNSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
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
    let client: SNSClient;
    let topic1ARN: string;

    beforeEach(async () => {
      await delay(1000);
      await dropDatabase();
      client = new SNSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
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
    let client: SNSClient;
    let topic1ARN: string;

    beforeEach(async () => {
      await dropDatabase();
      client = new SNSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
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

  context('createTopicAttributes', () => {
    let client: SNSClient;

    beforeEach(async () => {
      await dropDatabase();
      client = new SNSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
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
              + '{"numRetries":1,"numNoDelayRetries":2,"minDelayTarget":3,"maxDelayTarget":4,"numMinDelayRetries":5,"numMaxDelayRetries":6,'
              + '"backoffFunction":"linear"},"disableOverrides":false}}',
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

  context('subscribe', () => {
    let client: SNSClient;
    let topic: AWS.SNS.CreateTopicResponse;
    beforeEach(async () => {
      await dropDatabase();
      client = new SNSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
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

  context('confirmSubscription', () => {
    let client: SNSClient;
    let topic: AWS.SNS.CreateTopicResponse;
    beforeEach(async () => {
      await dropDatabase();
      client = new SNSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      topic = await client.createTopic({ Name: 'Topic1' });
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
    let client: SNSClient;
    beforeEach(async () => {
      await dropDatabase();
      client = new SNSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
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

  context('listSubscriptionsByTopic', () => {
    let topic1Arn: string;
    let topic2Arn: string;
    let client: SNSClient;
    beforeEach(async () => {
      await dropDatabase();
      await delay(200);
      client = new SNSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
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

  context('listSubscriptions', () => {
    let topicArn: string;
    let client: SNSClient;
    beforeEach(async () => {
      await delay(100);
      await dropDatabase();
      client = new SNSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
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

  context('publish', () => {
    let sqs: SQSClient;
    let client: SNSClient;
    let topic: AWS.SNS.CreateTopicResponse;
    beforeEach(async () => {
      await dropDatabase();
      client = new SNSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
      sqs = new SQSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
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
      const queue = await sqs.createQueue({ QueueName: SYSTEM_QUEUE_NAME.SNS });
      const { Messages: [event] } = await sqs.receiveMessage({ QueueUrl: queue.QueueUrl });
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

  context('GetSubscription', () => {
    let client: SNSClient;
    beforeEach(async () => {
      await dropDatabase();
      client = new SNSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
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

  context('GetPublish', () => {
    let client: SNSClient;
    beforeEach(async () => {
      await dropDatabase();
      client = new SNSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
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

  context('ConfirmSubscription', () => {
    let client: SNSClient;
    beforeEach(async () => {
      await dropDatabase();
      client = new SNSClient({
        region: Env.region,
        endpoint: `${Env.URL}/api`,
        accessKeyId: Env.accessKeyId,
        secretAccessKey: Env.secretAccessKey,
        maxRetries: 0,
      });
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
  });
});
