import { ClientApiVersions } from 'aws-sdk/clients/sqs';
import { ServiceConfigurationOptions } from 'aws-sdk/lib/service';

type ClientConfiguration = ServiceConfigurationOptions & ClientApiVersions;

export { ClientConfiguration };
