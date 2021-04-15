import { SQNSClient } from './sqns/s-q-n-s-client';
declare const Env: {
    URL: string;
    PORT: number;
    companyId: string;
    accessKeyId: string;
    secretAccessKey: string;
};
declare function deleteTopics(client: SQNSClient): Promise<void>;
declare function deleteAllQueues(client: SQNSClient): Promise<void>;
declare function deleteDynamicDataOfResults(items_: {
    [key: string]: any;
}): void;
export { Env, deleteDynamicDataOfResults, deleteTopics, deleteAllQueues };
