"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseClient = void 0;
const sns_1 = __importDefault(require("aws-sdk/clients/sns"));
const sqs_1 = __importDefault(require("aws-sdk/clients/sqs"));
const moment_1 = __importDefault(require("moment"));
const xml2js_1 = __importDefault(require("xml2js"));
const authentication_1 = require("../auth/authentication");
const s_q_n_s_error_1 = require("../auth/s-q-n-s-error");
const request_client_1 = require("../request-client/request-client");
class BaseClient extends request_client_1.RequestClient {
    constructor(service, config) {
        super();
        this._arrayFields = ['MessageAttributes', 'member'];
        this._config = { ...config, region: BaseClient.REGION };
        this._sqs = new sqs_1.default({ ...this._config, endpoint: `${config.endpoint}/sqs` });
        this._sns = new sns_1.default({ ...this._config, endpoint: `${config.endpoint}/sns` });
    }
    request(request) {
        const headers = {
            'x-amz-date': moment_1.default().utc().format('YYYYMMDDTHHmmss'),
            host: request.uri.split('/')[2],
        };
        const authorization = authentication_1.generateAuthenticationHash({
            service: request.uri.split('/').pop(),
            accessKeyId: this._config.accessKeyId,
            secretAccessKey: this._config.secretAccessKey,
            region: this._config.region,
            date: headers['x-amz-date'],
            originalUrl: request.uri.split(headers.host)[1],
            host: headers.host,
            method: 'POST',
            body: request.body,
        });
        request.headers = { ...(request.headers || {}), ...headers, authorization };
        return this.post(request.uri, { body: JSON.stringify(request.body), headers: request.headers, jsonBody: true })
            .then((serverResponse) => new Promise((resolve, reject) => {
            xml2js_1.default.parseString(serverResponse, (parserError, result) => {
                if (parserError) {
                    const builder = new xml2js_1.default.Builder({ rootName: 'ErrorResponse' });
                    const error = Error(parserError.message);
                    error.error = builder.buildObject({ Error: { Code: parserError.name, Message: parserError.message } });
                    reject(error);
                    return;
                }
                resolve(this.transformServerResponse(result));
            });
        }))
            .catch((error) => new Promise((resolve, reject) => {
            xml2js_1.default.parseString(error.error || error.message, (parserError, result) => {
                if (parserError) {
                    reject(new s_q_n_s_error_1.SQNSError({ code: error.code, message: error.message }));
                    return;
                }
                const { Code: [code], Message: [message] } = result.ErrorResponse.Error[0];
                reject(new s_q_n_s_error_1.SQNSError({ code, message }));
            });
        }));
    }
    transformServerResponse(input) {
        if (typeof input !== 'object') {
            return input;
        }
        const output = {};
        Object.keys(input).forEach((key) => {
            if (input[key] instanceof Array) {
                const inputValue = input[key];
                // tslint:disable-next-line:prefer-conditional-expression
                if (!this._arrayFields.includes(key) && inputValue.length === 1) {
                    output[key] = inputValue[0] === '' ? [] : this.transformServerResponse(inputValue[0]);
                }
                else {
                    output[key] = inputValue.map((each) => this.transformServerResponse(each));
                }
            }
            else {
                output[key] = this.transformServerResponse(input[key]);
            }
        });
        return output;
    }
}
exports.BaseClient = BaseClient;
BaseClient.REGION = 'sqns';
//# sourceMappingURL=base-client.js.map