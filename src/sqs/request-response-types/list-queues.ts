interface ListQueuesRequest {
  QueueNamePrefix?: string;
}

interface ListQueuesResult {
  QueueUrls?: Array<string>;
}

export { ListQueuesRequest, ListQueuesResult };
