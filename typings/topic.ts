import { ARN, Tag, Topic } from './common';

export interface CreateTopicInput {
  Name: string;
  Attributes?: Record<string, string>;
  Tags?: Array<Tag>;
}

export interface CreateTopicResponse {
  TopicArn?: ARN;
}

export interface ListTopicsInput {
  NextToken?: string;
}

export interface ListTopicsResponse {
  Topics?: Array<Topic>;
  NextToken?: string;
}

export interface GetTopicAttributesInput {
  TopicArn: ARN;
}

export interface GetTopicAttributesResponse {
  Attributes?: Record<string, string>;
}

export interface DeleteTopicInput {
  TopicArn: ARN;
}

export interface SetTopicAttributesInput {
  TopicArn: ARN;
  AttributeName: string;
  AttributeValue?: string;
}
