import { EventItem } from '../../../client';

export class ActiveEventManagement {
  private static _activeEventIds: Array<string> = [];

  static isEventPresent(item: EventItem): boolean {
    return ActiveEventManagement._activeEventIds.includes(item.id);
  }

  static addActiveEvent(item: EventItem): void {
    ActiveEventManagement._activeEventIds.push(item.id);
  }

  static resetActiveEvents(): void {
    ActiveEventManagement._activeEventIds = [];
  }
}
