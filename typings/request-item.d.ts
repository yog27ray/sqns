// <reference path="./index.d.ts" />

import { MessageAttributeMap } from './common';

export declare interface RequestItem {
  MessageBody: string;

  DelaySeconds?: number;

  MessageAttributes?: MessageAttributeMap;

  MessageSystemAttributes?: MessageAttributeMap;

  MessageDeduplicationId?: string;

  MessageGroupId?: string;
}
