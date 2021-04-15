"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestClient = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const s_q_n_s_error_1 = require("../auth/s-q-n-s-error");
class RequestClient {
    async post(url, { body, headers: headers_ = {}, json, jsonBody } = {}) {
        const headers = headers_;
        if (jsonBody) {
            headers['Content-Type'] = 'application/json';
        }
        const response = await node_fetch_1.default(url, { method: 'POST', body, headers });
        return this.transformResponse(response, json);
    }
    async get(url, json) {
        const response = await node_fetch_1.default(url);
        return this.transformResponse(response, json);
    }
    async transformResponse(response, json) {
        if (response.status >= 200 && response.status < 300) {
            if (json) {
                return response.json();
            }
            return response.text();
        }
        const errorMessage = await response.text();
        throw new s_q_n_s_error_1.SQNSError({
            message: errorMessage,
            code: `${response.status}`,
        });
    }
}
exports.RequestClient = RequestClient;
//# sourceMappingURL=request-client.js.map