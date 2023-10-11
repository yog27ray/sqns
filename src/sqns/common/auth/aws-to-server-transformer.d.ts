import { ExpressMiddleware } from '../../../../typings/express';
declare class AwsToServerTransformer {
    static transformRequestBody(): ExpressMiddleware;
    static transformArrayToJSON<T = string>(itemArray: Array<{
        Name: string;
        Value: string;
    }>): Record<string, T>;
    private static extractNestedJSON;
    private static transformJSONArrayToNestedJSON;
    private static transformPlainJSONToNestedJSON;
    private static subArray;
}
export { AwsToServerTransformer };
