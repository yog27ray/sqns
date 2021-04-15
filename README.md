[![codecov](https://codecov.io/gh/yog27ray/sqns/branch/master/graph/badge.svg)](https://codecov.io/gh/yog27ray/sqns)

#Introduction
SQNS is a Simple Queue and Notification Service. It manages processing of queues and notification due to various events
and subscriptions in distributed system. This service can be divided into following sections.
1. Queue Management
2. Notification Management

This project has been inspired from AWS SQS and AWS SNS.
This is an extension of the existing AWS SQS and AWS SNS with some more functionality add that we felt were lagging.

# Prerequisites
- Express app
- MongoDB Server

# Installation
- npm install sqns --save

## Queue Management
Queue management is a distributed multiple priority queue processing system.
This is divided into two part Manager and Workers.
Manager collects all the events sent via different channels.
Worker requests events from Manager to process them.
There can be only one Manager, but many Workers.

### Queue Manager
1. Initialize queue manager
    ```js
    import { SQNS } from 'sqns';
    
    const dataBaseConnectionConfig = {};
    const sqns = new SQNS({
        endpoint: 'http://your.server.url/api',
        adminSecretKeys: [{ accessKey: 'yourKey', secretAccessKey: 'yourSecretKey' }],
        db: { uri: 'DatabaseUri', config: dataBaseConnectionConfig },
        sns: { // optional
          disable: true // disable SNS service initialization.
        },
    });
    ```
2. Register routes with Express Server.
    ```js
    sqns.registerExpressRoutes(app);
    ```

### Queue Worker

1. Initialize Worker
    ```js
    import { SQNSClient } from 'sqns';
    
    const sqnsClient = new SQNSClient({
     endpoint: 'http://your.server.url/api',
     accessKeyId: 'yourKey',
     secretAccessKey: 'yourSecretKey',
    });
    ```
2. Create Queue
    ```js
    sqnsClient.createQueue({ QueueName: 'queueName' }).then(queue => {});
    ```
3. Send a Message to the queue
    ```js
    sqnsClient.sendMessage({ QueueUrl: queue.QueueUrl, MessageBody: '123' });
    ```
4. Receive a Message form queue
    ```js
    client.receiveMessage({  QueueUrl: queue.QueueUrl, MaxNumberOfMessages: 1 })
    .then(response => {
      const message = response.Messages[0]
    });
    ```

### Manager Scheduler

Either you can use the SQNSClient support to add the event in the queue or use ManagerEventScheduler to
 fetch events and add them into the queue periodically. ManagerEventScheduler constructor requires below parameters.
1. SQNSClient options.
2. Queue Name and Initial Params json to which events will be added.
3. Listener function to fetch request related to Events that need to be added in the queue.
 This function returns array of two elements.
 First is pagination params for next call and second is items that need to be added in the queue.
 If items that need to be added in the queue length is zero then next time listener function will be called wih initial pagination params.
4. Cron Interval (optional).
```js
import { ManagerEventScheduler } from 'sqns';

...

new ManagerEventScheduler(
  {
    endpoint: 'http://xyz.abz/api', // Master Server address
    accessKeyId: 'accessKey',
    secretAccessKey: 'secretKey',
  },
  { 'queueName': { page: 0 } },
  (params) => {
    const items = []// request events to be added in the queue
    const eventItems = items.map(each => {
      const requestItem = {
        MessageBody: each.message,
        DelaySeconds: 10, // optional
        MessageAttributes: {  attribute1: { StringValue: 'value1', DataType: 'String' } }, // optional
        MessageSystemAttributes: {  attribute1: { StringValue: 'value1', DataType: 'String' } }, // optional
        MessageDeduplicationId: each.duplicationId, // optional
      };
      return requestItem;
    });
    return [{ "page": params.page + 1 }, eventItems];
  },
  '*/10 * * * * *');
```

#### Processing Scheduler

Either you can use SimpleQueueServerClient support to fetch the event from Manager Server or use WorkerEventScheduler
 to fetch events and process them periodically.
WorkerEventScheduler constructor requires below parameters
1. SimpleQueueServerClient options.
2. Array of Queue Name to which events will be added.
3. Listener function that will be called with EventItem to be process.
4. Cron Interval (optional).
```js
import { WorkerEventScheduler } from 'sqns';

...

new WorkerEventScheduler(
    {
        endpoint: 'http://xyz.abz/api', // Master Server address
        accessKeyId: 'accessKey',
        secretAccessKey: 'secretKey',
    },
    ["queueName"],
      (queueName, item) => {
        // process eventItem
      },
      '0 * * * *');
```

## Notification Management
Notification Management deals with passing one published event to many subscribed links.
This uses the Queue Management module for passing published events to its subscribers. 

### Notification Manager

1. Initialize queue manager
    ```js
    import { SQNS } from 'sqns';
    
    const dataBaseConnectionConfig = {};
    const sqns = new SQNS({
        endpoint: 'http://your.server.url/api',
        adminSecretKeys: [{ accessKey: 'yourKey', secretAccessKey: 'yourSecretKey' }],
        db: { uri: 'DatabaseUri', config: dataBaseConnectionConfig },
    });
    ```
2. Register routes with Express Server
    ```js
    sqns.registerExpressRoutes(app);
    ```
3. Notification Scheduler
    ```js
    import { WorkerEventScheduler } from 'sqns';
    
    ...
    
    new WorkerEventScheduler(
        {
            endpoint: 'http://xyz.abz/api', // Master Server address
            accessKeyId: 'accessKey',
            secretAccessKey: 'secretKey',
        },
        ["sqns"], // SNS queue name
          (queueName, item) => {
            // process eventItem
          },
          '0 * * * *');
    ```
4. Create Topic
    ```js
    client.createTopic({ Name: 'Topic1' })
    .then(topic => {})
    ```
5. Publish Message
    ```js
    client.publish({ Message: 'This is message' })
    ```

## SQNSClient

### createQueue
```js
sqnsClient.createQueue({
  QueueName: 'queueName',
  Attributes: { attribute1: 'value1' }, // optional
  tags: { tag1: 'value2'}, // optional
}).then(queue => {});
```
#### CreateQueue Attributes
1. maxReceiveCount: Maximum number of time any event of the queue will be retried.
```js
client.createQueue({ ..., Attributes: { maxReceiveCount: '2' } });
```
### sendMessage
```js
client.sendMessage({
  QueueUrl: queue.QueueUrl,
  MessageAttributes: { // optional
    attribute1: {
      StringValue: 'value1',
      DataType: 'String'
    } 
  },
  MessageSystemAttributes: { // optional
    attribute1: { 
      StringValue: 'attributeValue', 
      DataType: 'String' 
    } 
  },
  MessageDeduplicationId: 'uniqueId1', // optional: message unique Id to avoid duplication of message.
  MessageBody: 'This is message body',
});
```
### sendMessageBatch
```js
client.sendMessageBatch({
  QueueUrl: queue.QueueUrl,
  Entries: [
    {
      Id: '123',  // Entry id for the request. Should be unique in one call.
      MessageAttributes: { // optional
         attribute1: {
           StringValue: 'value1',
           DataType: 'String'
         } 
       },
      MessageSystemAttributes: { // optional
        attribute1: { 
          StringValue: 'attributeValue', 
          DataType: 'String' 
        } 
      },
      MessageDeduplicationId: 'uniqueId1', // optional: message unique Id to avoid duplication of message.
      MessageBody: 'This is message body',
    }, 
  ],
});
```
### receiveMessage
```js
client.receiveMessage({
  QueueUrl: queue.QueueUrl,
  AttributeNames: ['attributeValue'], // optional: Array of attribute name to include. ALL to add all attributes
  MessageSystemAttributes: ['ALL'], // optional: Array of attribute name to include. ALL to add all attributes
  MaxNumberOfMessages: 10, // optional: number of messages to fetch in one call
  VisibilityTimeout: 30, // optional: message not available for next 30 seconds to retry.
}).then(response => {
  const MessageId = response.Messages[0].MessageId;
});
```
### listQueues
```js
client.listQueues({
  QueueNamePrefix: 'queuePrefix', // optional: queueName prefix to find list of queues
  NextToken: 'nextQuestToken', // optional: token from previous listQueue request.
})
```
### deleteQueue
```js
client.deleteQueue({ QueueUrl: queue.QueueUrl });
```
### getQueueUrl
```js
client.getQueueUrl({ QueueName: 'queueName' });
```
### markEventSuccess
```js
client.markEventSuccess(MessageId, queue.QueueUrl, 'success message');
```
### markEventFailure
```js
client.markEventFailure(MessageId, queue.QueueUrl, 'success message');
```
### createTopic
```js
client.createTopic({
  Name: 'Topic1', // topic name
  Attributes: { DisplayName: 'Topic One' }, // optional
  Tags: [{ Key: 'tag1', Value: 'value1' }], // optional
}).then(topic => {});
```
### listTopics
```js
client.listTopics({
  NextToken: 'nextToken' // optinal
})
```
### getTopicAttributes
```js
client.getTopicAttributes({ TopicArn: topic.TopicArn })
```
### setTopicAttributes
```js
client.setTopicAttributes({
  TopicArn: topic.TopicArn,
  AttributeName: 'DisplayName',
  AttributeValue: 'Updated Topic One',
})
```
### deleteTopic
```js
client.deleteTopic({ TopicArn: topic.TopicArn });
```
### publish
```js
client.publish({
  Message: 'This is message',
  TopicArn: topic.TopicArn, // TopicArn Or TargetArn is required
  TargetArn: topic.TopicArn, // TopicArn Or TargetArn is required
  MessageAttributes: { key1: { DataType: 'String', StringValue: 'value' } }, // optional
})
```
### subscribe
```js
client.subscribe({
 TopicArn: topic.TopicArn,
 Attributes: { key: 'value' }, // optional
 Endpoint: 'http://your.server.subscription/url', // subscription url
 Protocol: 'http', // http or https
 ReturnSubscriptionArn: true, // optional
}).then(result => {
  const SubscriptionArn = result.SubscriptionArn;
})
```
### listSubscriptions
```js
client.listSubscriptions({
  NextToken: 'NextToken' // optional
})
```
### listSubscriptionsByTopic
```js
client.listSubscriptionsByTopic({
 TopicArn: topic.TopicArn,
 NextToken: 'NextToken' // optional
});
```
### confirmSubscription
```js
client.confirmSubscription({
 TopicArn: 'topicArn',
 Token: 'verificationToken',
});
```
### unsubscribe
```js
client.unsubscribe({ SubscriptionArn: 'subscriptionArn' });
```
### getPublish
```js
client.getPublish({ MessageId: 'MessageId' })
```
### getSubscription
```js
client.getSubscription({ SubscriptionArn: 'subscriptionArn' })
```
### markPublished
```js
client.markPublished({ MessageId: 'MessageId' })
```
