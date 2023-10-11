"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const base_client_1 = require("./base-client");
describe('BaseClient', () => {
    context('execution of normalizeNestedJSONBody', () => {
        it('should pass with test body 1', () => {
            const result = new base_client_1.BaseClient({ endpoint: '', accessKeyId: '', secretAccessKey: '' }).normalizeNestedJSONBody({
                QueueUrl: 'http://127.0.0.1:1234/api/sqs/sqns/1/queue1.fifo',
                Action: 'SendMessageBatch',
                SendMessageBatchRequestEntry: [{
                        Id: '1231',
                        MessageBody: 'type1',
                        MessageAttributes: { priority: { StringValue: '100', DataType: 'String' } },
                    }, {
                        Id: '1232',
                        MessageBody: 'type2',
                        MessageAttributes: { priority: { StringValue: '10', DataType: 'String' } },
                    }],
            }, false);
            (0, chai_1.expect)(result).to.deep.equals({
                Action: 'SendMessageBatch',
                QueueUrl: 'http://127.0.0.1:1234/api/sqs/sqns/1/queue1.fifo',
                'SendMessageBatchRequestEntry.1.Id': '1231',
                'SendMessageBatchRequestEntry.1.MessageAttributes.1.Name': 'priority',
                'SendMessageBatchRequestEntry.1.MessageAttributes.1.Value.DataType': 'String',
                'SendMessageBatchRequestEntry.1.MessageAttributes.1.Value.StringValue': '100',
                'SendMessageBatchRequestEntry.1.MessageBody': 'type1',
                'SendMessageBatchRequestEntry.2.Id': '1232',
                'SendMessageBatchRequestEntry.2.MessageAttributes.1.Name': 'priority',
                'SendMessageBatchRequestEntry.2.MessageAttributes.1.Value.DataType': 'String',
                'SendMessageBatchRequestEntry.2.MessageAttributes.1.Value.StringValue': '10',
                'SendMessageBatchRequestEntry.2.MessageBody': 'type2',
            });
        });
        it('should pass with test body 2', () => {
            const result = new base_client_1.BaseClient({ endpoint: '', accessKeyId: '', secretAccessKey: '' }).normalizeNestedJSONBody({
                Name: 'Topic1',
                Attributes: { DisplayName: 'Topic One' },
                Tags: [
                    { Key: 'tag1', Value: 'value1' },
                    { Key: 'tag2', Value: 'value2' },
                ],
                Action: 'CreateTopic',
            }, true);
            (0, chai_1.expect)(result).to.deep.equals({
                Action: 'CreateTopic',
                'Attributes.entry.1.key': 'DisplayName',
                'Attributes.entry.1.value': 'Topic One',
                Name: 'Topic1',
                'Tags.member.1.Key': 'tag1',
                'Tags.member.1.Value': 'value1',
                'Tags.member.2.Key': 'tag2',
                'Tags.member.2.Value': 'value2',
            });
        });
        it('should pass with test body 3', () => {
            const result = new base_client_1.BaseClient({ endpoint: '', accessKeyId: '', secretAccessKey: '' }).normalizeNestedJSONBody({
                Message: 'This is message',
                TopicArn: 'arn:sqns:sns:sqns:1:Topic1',
                TargetArn: 'arn:sqns:sns:sqns:1:Topic1',
                PhoneNumber: '9999999999',
                Subject: 'Subject',
                MessageAttributes: { key1: { DataType: 'String', StringValue: 'value' } },
                Action: 'Publish',
            }, true);
            (0, chai_1.expect)(result).to.deep.equals({
                Action: 'Publish',
                Message: 'This is message',
                'MessageAttributes.entry.1.Name': 'key1',
                'MessageAttributes.entry.1.Value.DataType': 'String',
                'MessageAttributes.entry.1.Value.StringValue': 'value',
                PhoneNumber: '9999999999',
                Subject: 'Subject',
                TargetArn: 'arn:sqns:sns:sqns:1:Topic1',
                TopicArn: 'arn:sqns:sns:sqns:1:Topic1',
            });
        });
    });
});
//# sourceMappingURL=base-client.spec.js.map