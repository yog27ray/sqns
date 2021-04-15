"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecretKey = exports.generateAuthenticationHash = exports.authentication = void 0;
const v4_js_1 = __importDefault(require("aws-sdk/lib/signers/v4.js"));
const moment_1 = __importDefault(require("moment"));
const express_helper_1 = require("../routes/express-helper");
const encryption_1 = require("./encryption");
const s_q_n_s_error_1 = require("./s-q-n-s-error");
function getSecretKey(storageEngine) {
    return async (accessKeyId) => {
        const accessKey = await storageEngine.findAccessKey({ accessKey: accessKeyId })
            .catch((error) => {
            if (error.code === 'NotFound') {
                s_q_n_s_error_1.SQNSError.invalidSignatureError();
            }
            return Promise.reject(error);
        });
        const user = await storageEngine.findUser({ id: accessKey.userId });
        return { secretAccessKey: accessKey.secretKey, accessKeyId: accessKey.accessKey, user };
    };
}
exports.getSecretKey = getSecretKey;
function generateAuthenticationHash({ service, method, accessKeyId, secretAccessKey, region, date, host, originalUrl, body }) {
    const testRequest = {
        method,
        region,
        body: Object.keys(body).sort().map((key) => `${key}=${encodeURIComponent(body[key])}`).join('&'),
        search: () => '',
        pathname: () => originalUrl,
        headers: {
            'X-Amz-Content-Sha256': encryption_1.Encryption.createHash('sha256', Object.keys(body).sort().map((key) => `${key}=${encodeURIComponent(body[key])}`).join('&')),
            Host: host,
            Authorization: '',
        },
    };
    new v4_js_1.default(testRequest, service, { signatureCache: true, operation: {}, signatureVersion: 'v4' })
        .addAuthorization({ accessKeyId, secretAccessKey }, moment_1.default(date, 'YYYYMMDDTHHmmssZ').toDate());
    return testRequest.headers.Authorization;
}
exports.generateAuthenticationHash = generateAuthenticationHash;
function authentication(getSecretKeyCallback) {
    return (req, res, next) => {
        const [accessKey, , region, service] = req.header('Authorization')
            .split(' ')[1].split('=')[1].split('/');
        getSecretKeyCallback(accessKey)
            .then(({ accessKeyId, secretAccessKey, user }) => {
            const verificationHash = generateAuthenticationHash({
                accessKeyId,
                secretAccessKey,
                region,
                date: req.header('x-amz-date'),
                host: req.header('host'),
                originalUrl: req.originalUrl,
                method: req.method,
                body: req.body,
                service,
            });
            const isTokenValid = req.header('Authorization') === verificationHash;
            if (!isTokenValid) {
                s_q_n_s_error_1.SQNSError.invalidSignatureError();
            }
            Object.assign(req, { user });
            return Promise.resolve();
        })
            .then(next)
            .catch((error) => express_helper_1.ExpressHelper.errorHandler(error, res));
    };
}
exports.authentication = authentication;
//# sourceMappingURL=authentication.js.map