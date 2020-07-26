import { SimpleQueueServerClient } from './sqs/aws';
declare const Env: {
    URL: string;
    PORT: number;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
};
declare function deleteQueues(client: SimpleQueueServerClient): Promise<any>;
declare function deleteDynamicDataOfResults(items_: {
    [key: string]: any;
}): void;
export { Env, deleteQueues, deleteDynamicDataOfResults };
