import { SQSServiceConfiguration } from '../../../../typings/client-confriguation';

export class SQSService {
  config: SQSServiceConfiguration;

  constructor(config: SQSServiceConfiguration) {
    this.config = { ...config };
    Object.freeze(this.config);
  }
}
