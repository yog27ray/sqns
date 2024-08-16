import { SNSServiceConfiguration } from '../../../../typings/client-confriguation';

export class SNSService {
  config: SNSServiceConfiguration;

  constructor(config: SNSServiceConfiguration) {
    this.config = { ...config };
    Object.freeze(this.config);
  }
}
