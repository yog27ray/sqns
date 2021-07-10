"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsToServerTransformer = void 0;
const uuid_1 = require("uuid");
class AwsToServerTransformer {
    static transformRequestBody() {
        return (req, res, next) => {
            req.sqnsBaseURL = `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}${req.baseUrl}`;
            if (req.method === 'GET') {
                req.serverBody = AwsToServerTransformer.transformPlainJSONToNestedJSON(req.query);
                Object.assign(req.serverBody, { requestId: uuid_1.v4() });
            }
            else {
                const [, , region] = req.header('Authorization').split(' ')[1].split('=')[1].split('/');
                req.serverBody = AwsToServerTransformer.transformPlainJSONToNestedJSON(req.body);
                Object.assign(req.serverBody, { requestId: uuid_1.v4(), region });
            }
            if (req.body.QueueUrl) {
                Object.assign(req.serverBody, { queueName: req.body.QueueUrl.split('/').pop() });
            }
            next();
        };
    }
    static transformArrayToJSON(itemArray) {
        const keyJSON = {};
        if (!itemArray) {
            return undefined;
        }
        itemArray.forEach((row) => {
            keyJSON[row.Name] = row.Value;
        });
        return keyJSON;
    }
    static extractNestedJSON(jsonArray, key) {
        return jsonArray.filter((each) => (each[0] === key))
            .map((each) => AwsToServerTransformer.subArray(each, 1, each.length));
    }
    static transformJSONArrayToNestedJSON(jsonArray) {
        const json = {};
        const processedKeys = [];
        const isArray = !isNaN(Number(jsonArray[0][0]));
        if (isArray) {
            const result = [];
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
        jsonArray.forEach((levels) => {
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
    static transformPlainJSONToNestedJSON(json) {
        const plainJSONInArray = Object.keys(json)
            .map((each) => each.split('.').concat(json[each]));
        return AwsToServerTransformer.transformJSONArrayToNestedJSON(plainJSONInArray);
    }
    static subArray(array, startIndex, endIndex) {
        return array.map((each) => each).slice(startIndex, endIndex);
    }
}
exports.AwsToServerTransformer = AwsToServerTransformer;
//# sourceMappingURL=aws-to-server-transformer.js.map