export interface ClientConfiguration {
  endpoint: string;
  region?: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface SQNSClientConfig {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export type SNSServiceConfiguration = ClientConfiguration & { endpoint: string; }

export type SQSServiceConfiguration = ClientConfiguration & { endpoint: string; }
