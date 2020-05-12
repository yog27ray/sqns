interface StorageAdapter {
  addEventItem(queueName: string, item: object): Promise<any>;
  findEventsToProcess(queueName: string, time: Date): Promise<Array<any>>;
  updateEvent(queueName: string, id: string, data: object): Promise<any>;
  getQueueNames(): Promise<Array<string>>;
}

export { StorageAdapter };
