[![codecov](https://codecov.io/gh/yog27ray/sqns/branch/master/graph/badge.svg)](https://codecov.io/gh/yog27ray/sqns)

#SQNS (Simple Queue And Notification Server)
SQNS is combination of two part SQS (Simple Queue Server) and SNS (Simple Notification Server).
I took inspiration from AWS SQS (Simple Queue Service) and AWS SNS (Simple Notification Service), for creating this library.

## SNS (Simple Notification Server)
This feature is yet to be added.

## SQS (Simple Queue Server)

SQS (Simple-Queue-Server) is a distributed multiple priority queue processing system.
The entire system is divided into two part Manager and Workers.
Manager collects all the events sent to this system via different servers.
Worker request Manager for events to process and perform processing of these events.
There can be only one Manager but many Workers in this systems.

### Getting Started

#### Prerequisites

- Express app
- npm install sqns --save

#### Manager Simple Queue Server

1. Register routes of Express Server.
    ```
    import { SQS } from 'sqns';
    
    ....
    
    const simpleQueueServer = new SQS();
    app.use('/api', simpleQueueServer.generateRoutes()); 
    ```
   This will enable the api support for the Collector server.
2. Setting different comparator function for different queues (Note: Not supported for FIFO queues.).
    ```
    simpleQueueServer.queueComparator('queueName', (item1, item2) => (item1.priority < item2.priority));
    ```
3. Add events in the queue
    ```
    import { EventItem, SimpleQueueServerClient } from 'sqns';
    ...
    const items = [];
    items.push(new EventItem());
    const sqsClient = new new SimpleQueueServerClient({
     region: 'serverRegion',
     endpoint: 'http://xyz.abz/api', // Master Server address
     accessKeyId: 'accessKey',
     secretAccessKey: 'secretKey',
     maxRetries: 2, // default value 3
    });
    sqsClient.
   ```

#### Worker Simple Queue Server

1. Create Worker Client.
    ```
    import { SimpleQueueServerClient } from 'sqns';
    ...
    const sqsClient = new new SimpleQueueServerClient({
     region: 'serverRegion',
     endpoint: 'http://xyz.abz/api', // Master Server address
     accessKeyId: 'accessKey',
     secretAccessKey: 'secretKey',
     maxRetries: 2, // default value 3
    });
   ```

2. Create Queue
    ```js
    const queue = await client.createQueue({ QueueName: 'queueName' });
    ```

3. Get Queue URL from queue name.
    ```js
    const queue = await client.getQueueUrl({ QueueName: 'queueName' });
    ```

4. Delete Queue
    ```js
    await client.deleteQueue({ QueueUrl: queue.QueueUrl });
    ```

5. List Queues
    ```js
    const list = await client.listQueues();
    ```

6. Send Message to Queue
    ```js
    const messageReceivedAcknowledgement = await client.sendMessage({
        QueueUrl: queue.QueueUrl,
        MessageAttributes: {
         fieldName1: { StringValue: 'fieldValue1', DataType: 'String' },
         fieldName2: { StringValue: 'fieldValue2', DataType: 'String' },
        },
        MessageBody: 'This is message.',
      });
    ```

7. Send Message Batch to Queue
    ```js
    const messageReceivedAcknowledgements = await client.sendMessageBatch({
        QueueUrl: queue.QueueUrl,
        Entries: [
         { Id: '1', MessageBody: 'This is message 1.' },
         { Id: '2', MessageBody: 'This is message 2.' },
       ],
      });
    ```

8. Receive message from the queue.
    ```js
    const { Messages } = await client.receiveMessage({
     QueueUrl: queue.QueueUrl,
     MaxNumberOfMessages: 2, // default value 1
    });
   ```

9. Mark processing event success
    ```js
    const { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl });
    await this.client.markEventSuccess(Messages[0].MessageId, this.queue.QueueUrl, 'Success message');
    ```

10. Mark processing event failure
    ```js
    const { Messages } = await client.receiveMessage({ QueueUrl: queue.QueueUrl });
    await this.client.markEventFailure(Messages[0].MessageId, this.queue.QueueUrl, 'Failure message');
    ```

#### Manager Scheduler

Either you can use the SimpleQueueServerClient support to add the event in the queue or use ManagerEventScheduler to
 fetch events and add them into the queue periodically. ManagerEventScheduler constructor requires below parameters
1. SimpleQueueServerClient options.
2. Queue Name to which events will be added.
3. Initial params to support pagination
4. Listener function to fetch request related to Events that need to be added in the queue.
 This function returns array of two elements.
 First is pagination params for next call and second is items that need to be added in the queue.
 If items that need to be added in the queue length is zero then next time listener function will be called wih initial pagination params.
5. Cron Interval (optional).
```
import { EventItem, ManagerEventScheduler } from 'sqns';

...

new ManagerEventScheduler(
  {
    region: 'serverRegion',
    endpoint: 'http://xyz.abz/api', // Master Server address
    accessKeyId: 'accessKey',
    secretAccessKey: 'secretKey',
  },
  'queueName',
  { page: 0 },
  (params) => {
    const items = // request events to be added in the queue
    const eventItems = items.map(each => new EventItem({ id: each.id, type: each.type, priority: each.priority }));
    return [{ "page": params.page + 1 }, eventItems];
  },
  '*/10 * * * * *');
})
```

#### Processing Scheduler

Either you can use SimpleQueueServerClient support to fetch the event from Manager Server or use WorkerEventScheduler
 to fetch events and process them periodically.
WorkerEventScheduler constructor requires below parameters
1. SimpleQueueServerClient options.
2. Queue Name to which events will be added.
3. Listener function that will be called with EventItem to be process.
4. Cron Interval (optional).
```
import { EventItem, WorkerEventScheduler } from 'sqns';

...

new WorkerEventScheduler(
    {
        region: 'serverRegion',
        endpoint: 'http://xyz.abz/api', // Master Server address
        accessKeyId: 'accessKey',
        secretAccessKey: 'secretKey',
    },
    "queueName",
      (eventItem) => {
        // process eventItem
      },
      '0 * * * *');
```

#### Storage Engine
Default it uses in-memory management of queue, i.e. if service is re-started all items will be lost. 
If you want to preserve queue even after re-start you can change the storage engine to MongoDB.
 
```
const simpleQueueServer = new SQS({ database: SQS.Database.MONGO_DB, config: { uri: 'mongodb://127.0.0.1:27017/sqns' } });
```
