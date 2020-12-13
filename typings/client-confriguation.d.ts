// <reference path="./index.d.ts" />

import { ClientApiVersions } from 'aws-sdk/clients/sqs';
import { ServiceConfigurationOptions } from 'aws-sdk/lib/service';

export type ClientConfiguration = ServiceConfigurationOptions & ClientApiVersions;
