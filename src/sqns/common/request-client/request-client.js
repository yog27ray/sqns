"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestClient = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const s_q_n_s_error_1 = require("../auth/s-q-n-s-error");
class RequestClient {
    static setMaxRetryAttempt(attempt) {
        RequestClient.MAX_RE_ATTEMPT = attempt;
    }
    async post(url, { body, headers: headers_ = {}, json, jsonBody } = {}) {
        const headers = headers_;
        if (jsonBody) {
            headers['Content-Type'] = 'application/json';
        }
        return this.exponentialRetryServerErrorRequest(() => (0, node_fetch_1.default)(url, { method: 'POST', body, headers }), json);
    }
    async get(url, json) {
        return this.exponentialRetryServerErrorRequest(() => (0, node_fetch_1.default)(url), json);
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
    async exponentialRetryServerErrorRequest(callback, jsonResponse, attempt = 1) {
        const response = await callback();
        if (response.status >= 500 && response.status < 600 && attempt < RequestClient.MAX_RE_ATTEMPT) {
            return this.retryWithAttempt(callback, jsonResponse, attempt);
        }
        return this.transformResponse(response, jsonResponse);
    }
    async retryWithAttempt(callback, jsonResponse, attempt) {
        const waitTime = (3 ** attempt) * 1000;
        await new Promise((resolve) => {
            setTimeout(resolve, waitTime);
        });
        return this.exponentialRetryServerErrorRequest(callback, jsonResponse, attempt + 1);
    }
}
exports.RequestClient = RequestClient;
RequestClient.MAX_RE_ATTEMPT = 3;
//# sourceMappingURL=request-client.js.map