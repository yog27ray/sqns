import { SQNSLoggingConfig } from './config';

export interface ClientConfiguration {
  endpoint: string;
  region?: string;
  accessKeyId: string;
  secretAccessKey: string;
  logging?: SQNSLoggingConfig;
}

export interface SQNSClientConfig {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  logging?: SQNSLoggingConfig;
}

export type SNSServiceConfiguration = ClientConfiguration & { endpoint: string; };

export type SQSServiceConfiguration = ClientConfiguration & { endpoint: string; };
