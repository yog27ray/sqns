import { ExpressMiddleware } from '../routes/master/express-helper';
declare class AwsToServerTransformer {
    static transformRequestBody(): ExpressMiddleware;
    static transformArrayToJSON(itemArray: Array<any>): {
        [key: string]: any;
    };
    private static extractNestedJSON;
    private static transformJSONArrayToNestedJSON;
    private static transformPlainJSONToNestedJSON;
    private static subArray;
}
export { AwsToServerTransformer };
