import { SQSServiceConfiguration } from '../types/client-confriguation';

export class SQSService {
  config: SQSServiceConfiguration;

  constructor(config: SQSServiceConfiguration) {
    this.config = { ...config };
    Object.freeze(this.config);
  }
}
