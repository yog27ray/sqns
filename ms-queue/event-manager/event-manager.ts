import debug from 'debug';
import { inject, injectable } from 'inversify';
import rp from 'request-promise';
import { EventItem } from './event-item';
import { EventQueue } from './event-queue';

const log = debug('ms-queue:EventManager');

@injectable()
class EventManager {
  private static DEFAULT_PRIORITIES = { PRIORITY_TOTAL: 0 };

  get eventStats(): object {
    const priorityStats = JSON.parse(JSON.stringify(EventManager.DEFAULT_PRIORITIES));
    const queueNames = this.eventQueue.queueNames();
    queueNames.forEach((queueName: string) => {
      Object.values(this.eventQueue.eventIds(queueName)).forEach((priority: number) => {
        if (!priorityStats[queueName]) {
          priorityStats[queueName] = { PRIORITY_TOTAL: 0 };
        }
        const statKey = `PRIORITY_${priority}`;
        EventManager.DEFAULT_PRIORITIES[statKey] = 0;
        if (!EventManager.DEFAULT_PRIORITIES[queueName]) {
          EventManager.DEFAULT_PRIORITIES[queueName] = { PRIORITY_TOTAL: 0 };
        }
        EventManager.DEFAULT_PRIORITIES[queueName][statKey] = 0;

        priorityStats[queueName][statKey] = (priorityStats[queueName][statKey] || 0) + 1;
        priorityStats[queueName].PRIORITY_TOTAL += 1;
        priorityStats[statKey] = (priorityStats[statKey] || 0) + 1;
        priorityStats.PRIORITY_TOTAL += 1;
      });
    });
    return priorityStats;
  }

  get prometheus(): string {
    const unixTimeStamp = new Date().getTime();
    const prometheusRows = [];
    const priorityStats = this.eventStats;
    Object.keys(priorityStats).forEach((queueName: string) => {
      if (typeof priorityStats[queueName] === 'object') {
        Object.keys(priorityStats[queueName]).forEach((key: string) => {
          prometheusRows.push(`${queueName}_queue_priority{label="${key}"} ${priorityStats[queueName][key]} ${unixTimeStamp}`);
        });
        return;
      }
      prometheusRows.push(`queue_priority{label="${queueName}"} ${priorityStats[queueName]} ${unixTimeStamp}`);
    });
    return `${prometheusRows.sort().join('\n')}\n`;
  }

  constructor(@inject(EventQueue) private eventQueue: EventQueue) {}

  initialize(notifyNeedTaskURLS: Array<string> = []): void {
    this.eventQueue.notifyNeedTaskURLS = notifyNeedTaskURLS;
  }

  add(queueName: string, eventItem: EventItem): void {
    if (this.eventQueue.isEventPresent(queueName, eventItem)) {
      return;
    }
    this.eventQueue.add(queueName, eventItem);
  }

  poll(queueName: string): EventItem {
    if (!this.eventQueue.size(queueName)) {
      this.notifyTaskNeeded(queueName)
        .catch((error: any) => log(error));
      return undefined;
    }
    return this.eventQueue.pop(queueName);
  }

  reset(queueName: string): void {
    return this.eventQueue.reset(queueName);
  }

  resetAll(): void {
    EventManager.DEFAULT_PRIORITIES = { PRIORITY_TOTAL: 0 };
    return this.eventQueue.resetAll();
  }

  private async notifyTaskNeeded(queueName: string, index: number = 0): Promise<any> {
    try {
      const url = this.eventQueue.notifyNeedTaskURLS[index];
      if (!url) {
        return;
      }
      await rp(url);
    } catch (error) {
      log(error);
    }
    await this.notifyTaskNeeded(queueName, index + 1);
  }
}

export { EventManager, EventItem };
