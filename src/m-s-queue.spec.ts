import { expect } from 'chai';
import rp from 'request-promise';
import { EventItem, MSQueueRequestHandler } from '../index';
import { mongoConnection, mSQueue } from './setup';
import { Env } from './test-env';

describe('MSQueue', () => {
  context('Processing of msQueue with comparator function in ascending order', () => {
    before(async () => {
      await mongoConnection.dropDatabase();
      mSQueue.queueComparator('queue1', (item1: EventItem, item2: EventItem) => (item1.priority > item2.priority));
      await rp({
        method: 'POST',
        uri: `${Env.URL}/api/queue/queue1/event/bulk/new`,
        body: [
          { id: '1231', type: 'type1', priority: 100 },
          { id: '1232', type: 'type2', priority: 10 },
          { id: '1233', type: 'type2', priority: 40 },
          { id: '1234', type: 'type2', priority: 20 },
          { id: '1235', type: 'type2', priority: 30 },
          { id: '1236', type: 'type2', priority: 1 },
        ],
        json: true,
      });
    });

    it('should process event in ascending item', async () => {
      const mSQueueRequestHandler = new MSQueueRequestHandler();
      let event = await mSQueueRequestHandler.fetchEventsFromQueue(`${Env.URL}/api`, 'queue1');
      expect(event.priority).to.equal(100);
      event = await mSQueueRequestHandler.fetchEventsFromQueue(`${Env.URL}/api`, 'queue1');
      expect(event.priority).to.equal(40);
      event = await mSQueueRequestHandler.fetchEventsFromQueue(`${Env.URL}/api`, 'queue1');
      expect(event.priority).to.equal(30);
      event = await mSQueueRequestHandler.fetchEventsFromQueue(`${Env.URL}/api`, 'queue1');
      expect(event.priority).to.equal(20);
      event = await mSQueueRequestHandler.fetchEventsFromQueue(`${Env.URL}/api`, 'queue1');
      expect(event.priority).to.equal(10);
      event = await mSQueueRequestHandler.fetchEventsFromQueue(`${Env.URL}/api`, 'queue1');
      expect(event.priority).to.equal(1);
      event = await mSQueueRequestHandler.fetchEventsFromQueue(`${Env.URL}/api`, 'queue1');
      expect(event).to.not.exist;
    });

    after(() => {
      mSQueue.queueComparator('queue1', undefined);
    });
  });

  context('Processing of msQueue with comparator function in descending order', () => {
    before(async () => {
      await mongoConnection.dropDatabase();
      mSQueue.queueComparator('queue1', (item1: EventItem, item2: EventItem) => (item1.priority < item2.priority));
      await rp({
        method: 'POST',
        uri: `${Env.URL}/api/queue/queue1/event/bulk/new`,
        body: [
          { id: '1231', type: 'type1', priority: 100 },
          { id: '1232', type: 'type2', priority: 10 },
          { id: '1233', type: 'type2', priority: 40 },
          { id: '1234', type: 'type2', priority: 20 },
          { id: '1235', type: 'type2', priority: 30 },
          { id: '1236', type: 'type2', priority: 1 },
        ],
        json: true,
      });
    });

    it('should process event in ascending item', async () => {
      const mSQueueRequestHandler = new MSQueueRequestHandler();
      let event = await mSQueueRequestHandler.fetchEventsFromQueue(`${Env.URL}/api`, 'queue1');
      expect(event.priority).to.equal(1);
      event = await mSQueueRequestHandler.fetchEventsFromQueue(`${Env.URL}/api`, 'queue1');
      expect(event.priority).to.equal(10);
      event = await mSQueueRequestHandler.fetchEventsFromQueue(`${Env.URL}/api`, 'queue1');
      expect(event.priority).to.equal(20);
      event = await mSQueueRequestHandler.fetchEventsFromQueue(`${Env.URL}/api`, 'queue1');
      expect(event.priority).to.equal(30);
      event = await mSQueueRequestHandler.fetchEventsFromQueue(`${Env.URL}/api`, 'queue1');
      expect(event.priority).to.equal(40);
      event = await mSQueueRequestHandler.fetchEventsFromQueue(`${Env.URL}/api`, 'queue1');
      expect(event.priority).to.equal(100);
      event = await mSQueueRequestHandler.fetchEventsFromQueue(`${Env.URL}/api`, 'queue1');
      expect(event).to.not.exist;
    });

    after(() => {
      mSQueue.queueComparator('queue1', undefined);
    });
  });
});
