# MS-QUEUE

MS-Queue (Master-Slave-Queue) is a distributed multiple priority queue processing system.
The entire system is divided into two part Collector and Processing.
Collector (Master) system collects all the events sent to this system via different servers.
Processing (Slave) system request Collector for event to process and start processing of the event.
There can be only one Collector sytem but many Processing systems.

## Getting Started

### Prerequisites

- Express app
- npm install ms-queue --save

### Collector System

1. Register routes of Express Server.
    ```
    import { MSQueue } from 'ms-queue';
    
    ....
    
    const mSQueue = new MSQueue();
    app.use('/api', mSQueue.generateRoutes()); 
    ```
   This will enable the api support for the Collector server.
2. Setting different comparator function for different queues.
    ```
   mSQueue.queueComparator('queueName', (item1, item2) => (item1.priority < item2.priority));
   ```
3. Add event in the queue
    ```
   import { EventItem, MSQueueRequestHandler } from 'ms-queuer';
   ...
   const items = [];
   items.push(new EventItem());
   const mSQueueRequestHandler = new MSQueueRequestHandler();
   mSQueueRequestHandler = new MSQueueRequestHandler().addEventsToQueue("http://collector.server.url/api", "queueName", items);
   ```

### Collector Server Api

1. Create a event in the queue
    ```
    POST /api/queue/:queueName/event/new
    {
        "id": "eventId",
        "type": "Type of Event",
         "data": { "extra": "infromation" },
         "priority": 100
    }
    ```

2. Create bulk event in the queue
    ```
    POST /api/queue/:queueName/event/bulk/new
    [{
        "id": "eventId1",
        "type": "Type of Event",
         "data": { "extra": "infromation" },
         "priority": 100
    }, {
       "id": "eventId2",
       "type": "Type of Event",
        "data": { "extra": "infromation" },
        "priority": 1
    }]
    ```

3. Reset a particular queue
    ```
    POST /api/queue/:queueName/reset
    ```

4. Reset all queues
    ```
    POST /api/queues/reset
    ```

5. Queue status
    ```
    GET /api/queues/events/stats
    GET /api/queues/events/stats?format=prometheus
    ```

6. Processing System request event url.
    ```
   GET /api/queue/:queueName/event/poll
   ```

#####Note: Event id is unique and optional. If not provided system will automatically assign one. If queue already have the event with same id, it will not be added twice.

### Collector Scheduler

Either you can use the api support to add the event in the queue or use CollectorEventScheduler to fetch events and add them into the queue periodically.
CollectorEventScheduler constructor requires below parameters
1. Collector server url.
2. Queue Name to which events will be added.
3. Initial params to support pagination
4. Listener function to fetch request related to Events that need to be added in the queue.
 This function returns array of two elements.
 First is pagination params for next call and second is items that need to be added in the queue.
 If items that need to be added in the queue length is zero then next time listener function will be called wih initial pagination params.
5. Cron Interval (optional).
```
import { EventItem, CollectorEventScheduler } from 'ms-queue';

...

new MasterEventScheduler(
      "http://collector.server.url/api",
      "queueName",
      { "page": 0 },
      (params) => {
        const items = // request events to be added in the queue
        const eventItems = items.map(each => new EventItem({ id: each.id, type: each.type, priority: each.priority }));
        return [{ "page": params.page + 1 }, eventItems];
      },
      '0 * * * *');
```

### Processing Scheduler
Either you can use the api support to fetch the event from CollectorServer or use ProcessingEventScheduler to fetch events and process them periodically.
ProcessingEventScheduler constructor requires below parameters
1. Collector server url.
2. Queue Name to which events will be added.
3. Listener function that will be called with EventItem to be process.
4. Cron Interval (optional).
```
import { EventItem, ProcessingEventScheduler } from 'ms-queue';

...

new ProcessingEventScheduler(
      "http://collector.server.url/api",
      "queueName",
      (eventItem) => {
        // process eventItem
      },
      '0 * * * *');
```

### Storage Engine
Default it uses in-memory management of queue, i.e. if service is restarted al items will be lost. 
If you want to preserve queue even after restart you can change the storage engine to MongoDB.
 
```
const mSQueue = new MSQueue({ database: MSQueue.Database.MONGO_DB, config: { uri: 'mongodb://127.0.0.1:27017/msQueue' } });
```
