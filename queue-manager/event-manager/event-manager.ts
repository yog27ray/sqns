import debug from 'debug';
import { inject, injectable } from 'inversify';
import rp from 'request-promise';
import { EventQueue } from './event-queue';
import { EventItem } from './event-item';

const log = debug('queue-manager:EventManager');

@injectable()
class EventManager {
  get eventStats(): object {
    const priorityStats = { PRIORITY_TOTAL: 0 };
    const queueNames = this.eventQueue.queueNames();
    queueNames.forEach((queueName: string) => {
      Object.values(this.eventQueue.eventIds(queueName)).forEach((priority: number) => {
        if (priorityStats[queueName]) {
          priorityStats[queueName] = { PRIORITY_TOTAL: 0 };
        }
        const statKey = `PRIORITY_${priority}`;
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
      Object.keys(priorityStats[queueName]).forEach((key: string) => {
        if (typeof priorityStats[key] === 'object') {
          prometheusRows.push(`${queueName}_queue_priority{label="${key}"} ${priorityStats[key]} ${unixTimeStamp}`);
          return;
        }
        prometheusRows.push(`queue_priority{label="${key}"} ${priorityStats[key]} ${unixTimeStamp}`);
      });
    });
    return `${prometheusRows.join('\n')}\n`;
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
