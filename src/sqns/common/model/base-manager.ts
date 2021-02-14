import { BaseStorageEngine } from './base-storage-engine';

export abstract class BaseManager {
  abstract getStorageEngine(): BaseStorageEngine;
}
