"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rfc3986EncodeURIComponent = exports.getSecretKey = exports.generateAuthenticationHash = exports.authentication = void 0;
const v4_js_1 = __importDefault(require("aws-sdk/lib/signers/v4.js"));
const moment_1 = __importDefault(require("moment"));
const logger_1 = require("../logger/logger");
const express_helper_1 = require("../routes/express-helper");
const encryption_1 = require("./encryption");
const s_q_n_s_error_1 = require("./s-q-n-s-error");
const log = logger_1.logger.instance('Authentication');
function getSecretKey(storageEngine) {
    return async (accessKeyId) => {
        const accessKey = await storageEngine.findAccessKey({ accessKey: accessKeyId })
            .catch((error) => {
            if (error.code === 'NotFound') {
                log.verbose(`AccessKey not found: ${accessKeyId}`);
                s_q_n_s_error_1.SQNSError.invalidSignatureError();
            }
            return Promise.reject(error);
        });
        const user = await storageEngine.findUser({ id: accessKey.userId });
        return { secretAccessKey: accessKey.secretKey, accessKeyId: accessKey.accessKey, user };
    };
}
exports.getSecretKey = getSecretKey;
function rfc3986EncodeURIComponent(str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, escape);
}
exports.rfc3986EncodeURIComponent = rfc3986EncodeURIComponent;
function generateAuthenticationHash({ service, method, accessKeyId, secretAccessKey, region, date, host, originalUrl, body }) {
    log.verbose('Received Authentication Data:', { service, method, accessKeyId, secretAccessKey, region, date, host, originalUrl, body });
    const testRequest = {
        method,
        region,
        body: Object.keys(body).sort().map((key) => `${key}=${rfc3986EncodeURIComponent(body[key])}`).join('&'),
        search: () => '',
        pathname: () => originalUrl,
        headers: {
            'X-Amz-Content-Sha256': encryption_1.Encryption.createHash('sha256', Object.keys(body).sort().map((key) => `${key}=${rfc3986EncodeURIComponent(body[key])}`).join('&')),
            Host: host,
            Authorization: '',
        },
    };
    log.verbose('Matching Against Authentication Data:', testRequest.headers, moment_1.default(date, 'YYYYMMDDTHHmmssZ').toDate());
    new v4_js_1.default(testRequest, service, { signatureCache: true, operation: {}, signatureVersion: 'v4' })
        .addAuthorization({ accessKeyId, secretAccessKey }, moment_1.default(date, 'YYYYMMDDTHHmmssZ').toDate());
    return testRequest.headers.Authorization;
}
exports.generateAuthenticationHash = generateAuthenticationHash;
function authentication(getSecretKeyCallback) {
    return (req, res, next) => {
        log.verbose('Authorization header received:', req.header('Authorization'));
        const [accessKey, , region, service] = req.header('Authorization')
            .split(' ')[1].split('=')[1].split('/');
        log.verbose('AccessKey:', accessKey, '\tregion:', region, '\tservice:', service);
        getSecretKeyCallback(accessKey)
            .then(({ accessKeyId, secretAccessKey, user }) => {
            log.verbose('DB AccessKey:', accessKeyId, '\tsecret:', secretAccessKey, '\tuser:', user.id);
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
            log.verbose('Matching generated hash:', verificationHash, 'against client hash: ', req.header('Authorization'));
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