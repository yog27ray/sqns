"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseClient = void 0;
const moment_1 = __importDefault(require("moment"));
const xml2js_1 = __importDefault(require("xml2js"));
const authentication_1 = require("../auth/authentication");
const s_q_n_s_error_1 = require("../auth/s-q-n-s-error");
const request_client_1 = require("../request-client/request-client");
const s_n_s_service_1 = require("./s-n-s-service");
const s_q_s_service_1 = require("./s-q-s-service");
class BaseClient extends request_client_1.RequestClient {
    constructor(config) {
        super();
        this._arrayFields = ['member', 'Message', 'SendMessageBatchResultEntry'];
        this._arrayToJSONFields = ['Attribute', 'MessageAttribute', 'entry'];
        this._config = { ...config, region: BaseClient.REGION };
        this._sqs = new s_q_s_service_1.SQSService({ ...this._config, endpoint: `${config.endpoint}/sqs` });
        this._sns = new s_n_s_service_1.SNSService({ ...this._config, endpoint: `${config.endpoint}/sns` });
    }
    processNormalizeJSONBodyOfKey(key, value, snsRequest) {
        const result = {};
        if (value === undefined) {
            return result;
        }
        if (value instanceof Array) {
            value.forEach((each, index) => {
                if (['SendMessageBatchRequestEntry', 'Tags'].includes(key)) {
                    const subJson = this.normalizeNestedJSONBody(each, snsRequest);
                    Object.keys(subJson).forEach((subKey) => {
                        if (snsRequest) {
                            result[`${key}.member.${index + 1}.${subKey}`] = subJson[subKey];
                        }
                        else {
                            result[`${key}.${index + 1}.${subKey}`] = subJson[subKey];
                        }
                    });
                }
                else {
                    result[`${key}.${index + 1}`] = each;
                }
            });
        }
        else if (typeof value === 'object') {
            const subObject = value;
            Object.keys(subObject).sort().forEach((k, index) => {
                if (typeof subObject[k] === 'object') {
                    if (snsRequest) {
                        result[`${key}.entry.${index + 1}.Name`] = k;
                        Object.keys(subObject[k]).sort().forEach((x) => {
                            result[`${key}.entry.${index + 1}.Value.${x}`] = subObject[k][x];
                        });
                    }
                    else {
                        result[`${key}.${index + 1}.Name`] = k;
                        Object.keys(subObject[k]).sort().forEach((x) => {
                            result[`${key}.${index + 1}.Value.${x}`] = subObject[k][x];
                        });
                    }
                    return;
                }
                if (snsRequest) {
                    result[`${key}.entry.${index + 1}.key`] = k;
                    result[`${key}.entry.${index + 1}.value`] = subObject[k];
                }
                else {
                    result[`${key}.${index + 1}.Name`] = k;
                    result[`${key}.${index + 1}.Value`] = subObject[k];
                }
            });
        }
        else {
            result[key] = value;
        }
        return result;
    }
    normalizeNestedJSONBody(body, snsRequest) {
        const result = {};
        Object.keys(body).sort().forEach((key) => {
            Object.assign(result, this.processNormalizeJSONBodyOfKey(key, body[key], snsRequest));
        });
        return result;
    }
    updateRequestBody(body_, snsRequest) {
        const body = body_;
        if (typeof body !== 'object') {
            return;
        }
        if (body instanceof Array) {
            body.forEach((each) => this.updateRequestBody(each, snsRequest));
            return;
        }
        Object.keys(body).forEach((key) => {
            if ([
                'Attributes',
                'MessageAttributes',
                'MessageSystemAttributes',
                'AttributeNames',
                'MessageAttributeNames',
            ].includes(key) && !snsRequest) {
                body[key.substring(0, key.length - 1)] = body[key];
                delete body[key];
            }
            if (typeof body[key] !== 'object') {
                return;
            }
            this.updateRequestBody(body[key], snsRequest);
        });
    }
    request(request) {
        const headers = {
            'x-sqns-date': (0, moment_1.default)().utc().format('YYYYMMDDTHHmmss'),
            host: request.uri.split('/')[2],
        };
        const isSNSRequest = request.uri.startsWith(`${this._config.endpoint}/sns`);
        this.updateRequestBody(request.body, isSNSRequest);
        request.body = this.normalizeNestedJSONBody(request.body, isSNSRequest);
        (0, authentication_1.signRequest)({
            service: request.uri.split('/').pop(),
            region: this._config.region,
            originalUrl: request.uri.split(headers.host)[1],
            headers,
            method: 'POST',
            body: request.body,
        }, {
            accessKeyId: this._config.accessKeyId,
            secretAccessKey: this._config.secretAccessKey,
        }, ['host', 'x-sqns-content-sha256', 'x-sqns-date']);
        request.headers = { ...(request.headers || {}), ...headers };
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
            // tslint:disable-next-line:arrow-parens
            .catch((originalError) => {
            const { error, message, code } = originalError;
            return new Promise((resolve, reject) => {
                xml2js_1.default.parseString(error || message, (parserError, result) => {
                    if (parserError) {
                        reject(new s_q_n_s_error_1.SQNSError({ code, message }));
                        return;
                    }
                    const { Code: [errorCode], Message: [errorMessage] } = result.ErrorResponse.Error[0];
                    reject(new s_q_n_s_error_1.SQNSError({ code: errorCode, message: errorMessage }));
                });
            });
        });
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
                if (this._arrayToJSONFields.includes(key)) {
                    output[`${key}s`] = inputValue.reduce((result_, item) => {
                        const result = result_;
                        if (item.Name) {
                            result[item.Name[0]] = this.transformServerResponse(item.Value[0]);
                        }
                        else {
                            result[item.key[0]] = this.transformServerResponse(item.value[0]);
                        }
                        return result;
                    }, {});
                    return;
                }
                if (!this._arrayFields.includes(key) && inputValue.length === 1) {
                    output[key] = inputValue[0] === ''
                        ? undefined
                        : this.transformServerResponse(inputValue[0]);
                    return;
                }
                if (this._arrayFields.includes(key) && inputValue.length === 1 && inputValue[0] === '') {
                    output[key] = [];
                    return;
                }
                output[key] = inputValue.map((each) => this.transformServerResponse(each));
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