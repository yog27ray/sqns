import { NextFunction, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { ExpressMiddleware } from '../../../../typings/express';

class AwsToServerTransformer {
  static transformRequestBody(): ExpressMiddleware {
    return (req: Request & { serverBody: { [key: string]: any }; sqnsBaseURL: string }, res: Response, next: NextFunction): void => {
      req.sqnsBaseURL = `${req.headers['x-forwarded-proto'] as string || req.protocol}://${req.get('host')}${req.baseUrl}`;
      if (req.method === 'GET') {
        req.serverBody = AwsToServerTransformer.transformPlainJSONToNestedJSON(req.query);
        Object.assign(req.serverBody, { requestId: uuid() });
      } else {
        const [, , region]: Array<string> = req.header('Authorization').split(' ')[1].split('=')[1].split('/');
        req.serverBody = AwsToServerTransformer.transformPlainJSONToNestedJSON(req.body);
        Object.assign(req.serverBody, { requestId: uuid(), region });
      }
      if (req.body.QueueUrl) {
        Object.assign(req.serverBody, { queueName: req.body.QueueUrl.split('/').pop() });
      }
      next();
    };
  }

  static transformArrayToJSON(itemArray: Array<any>): { [key: string]: any } {
    const keyJSON = {};
    if (!itemArray) {
      return undefined;
    }
    itemArray.forEach((row: any) => {
      keyJSON[row.Name] = row.Value;
    });
    return keyJSON;
  }

  private static extractNestedJSON(jsonArray: Array<Array<string>>, key: string): Array<Array<string>> {
    return jsonArray.filter((each: Array<string>) => (each[0] === key))
      .map((each: Array<string>) => AwsToServerTransformer.subArray(each, 1, each.length));
  }

  private static transformJSONArrayToNestedJSON(jsonArray: Array<Array<string>>): any {
    const json = {};
    const processedKeys = [];
    const isArray = !isNaN(Number(jsonArray[0][0]));
    if (isArray) {
      const result: Array<{ [key: string]: any }> = [];
      let index = 1;
      while (index > 0) {
        const subJSONArray = AwsToServerTransformer.extractNestedJSON(jsonArray, `${index}`);
        if (!subJSONArray.length) {
          return result;
        }
        result[index - 1] = subJSONArray.length === 1 && subJSONArray[0].length === 1
          ? subJSONArray[0][0]
          : AwsToServerTransformer.transformJSONArrayToNestedJSON(subJSONArray);
        index += 1;
      }
    }
    jsonArray.forEach((levels: Array<string>) => {
      const key = levels[0];
      if (processedKeys.includes(key)) {
        return;
      }
      processedKeys.push(key);
      if (levels.length === 2) {
        json[key] = levels[1];
        return;
      }
      json[key] = AwsToServerTransformer.transformJSONArrayToNestedJSON(AwsToServerTransformer.extractNestedJSON(jsonArray, key));
    });
    return json;
  }

  private static transformPlainJSONToNestedJSON(json: { [key: string]: any }): { [key: string]: any } {
    const plainJSONInArray: Array<Array<string>> = Object.keys(json)
      .map((each: string): Array<string> => each.split('.').concat(json[each]));
    return AwsToServerTransformer.transformJSONArrayToNestedJSON(plainJSONInArray) as { [key: string]: any };
  }

  private static subArray(array: Array<string>, startIndex: number, endIndex: number): Array<string> {
    return array.map((each: string) => each).slice(startIndex, endIndex);
  }
}

export { AwsToServerTransformer };
