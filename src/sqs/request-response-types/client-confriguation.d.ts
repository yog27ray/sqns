import { ClientApiVersions } from 'aws-sdk/clients/sqs';
import { ServiceConfigurationOptions } from 'aws-sdk/lib/service';
declare type ClientConfiguration = ServiceConfigurationOptions & ClientApiVersions;
export { ClientConfiguration };
