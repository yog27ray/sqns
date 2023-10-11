"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signRequest = exports.getSecretKey = exports.authentication = void 0;
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
                log.error(`AccessKey not found: ${accessKeyId}`);
                s_q_n_s_error_1.SQNSError.invalidSignatureError();
            }
            return Promise.reject(error);
        });
        const user = await storageEngine.findUser({ id: accessKey.userId });
        return { secretAccessKey: accessKey.secretKey, accessKeyId: accessKey.accessKey, user };
    };
}
exports.getSecretKey = getSecretKey;
function signRequest(authRequest_, credentials, headerKeys_) {
    log.verbose('Received Authentication Data:', authRequest_);
    const authRequest = authRequest_;
    const headerKeys = headerKeys_.map((each) => each).sort();
    authRequest.headers['x-sqns-content-sha256'] = encryption_1.Encryption.createJSONHash('sha256', authRequest.body);
    const data = { ...authRequest, accessKeyId: credentials.accessKeyId };
    data.headers = headerKeys.reduce((result_, key) => {
        const result = result_;
        result[key] = authRequest.headers[key];
        return result;
    }, {});
    const hash = encryption_1.Encryption.createJSONHmac('sha256', credentials.secretAccessKey, data);
    const algorithm = 'SQNS-HMAC-SHA256';
    const credential = `Credential=${credentials.accessKeyId}/${data.headers['x-sqns-date'].substring(0, 8)}/${authRequest.region}/${authRequest.service}/request`;
    const signedHeaders = `SignedHeaders=${headerKeys.join(';')}`;
    const signature = `Signature=${hash}`;
    authRequest.headers.authorization = `${algorithm} ${credential}, ${signedHeaders}, ${signature}`;
}
exports.signRequest = signRequest;
function verifyRequest(authRequest, credentials, user) {
    const testHeaders = { ...authRequest.headers };
    const headerKeys = testHeaders.authorization.split(', ')[1].split('=')[1].split(';');
    const testAuthRequest = { ...authRequest, headers: testHeaders };
    signRequest(testAuthRequest, credentials, headerKeys);
    log.verbose('Matching generated hash:', testAuthRequest.headers.authorization, 'against client hash: ', authRequest.headers.authorization);
    if (testAuthRequest.headers.authorization === authRequest.headers.authorization) {
        return;
    }
    log.error('Received Authentication Data:', authRequest);
    log.error('Authorization header received:', authRequest.headers.authorization);
    log.error('Matching generated hash:', testAuthRequest.headers.authorization, 'against client hash: ', authRequest.headers.authorization);
    if (!user.skipAuthentication) {
        s_q_n_s_error_1.SQNSError.invalidSignatureError();
    }
}
function authentication(getSecretKeyCallback) {
    return (req, res, next) => {
        log.verbose('Authorization header received:', req.header('Authorization'));
        if (!req.header('Authorization') || req.header('Authorization').split(' ').length !== 4) {
            express_helper_1.ExpressHelper.errorHandler(new s_q_n_s_error_1.SQNSError({
                code: 'SignatureDoesNotMatch',
                message: 'The request signature we calculated does not match the signature you provided.',
            }), res);
            return;
        }
        const [accessKey, , region, service] = req.header('Authorization')
            .split(' ')[1].split('=')[1].split('/');
        log.verbose('AccessKey:', accessKey, '\tregion:', region, '\tservice:', service);
        getSecretKeyCallback(accessKey)
            .then(({ accessKeyId, secretAccessKey, user }) => {
            log.verbose('DB AccessKey:', accessKeyId, '\tsecret:', secretAccessKey, '\tuser:', user.id);
            verifyRequest({
                region,
                originalUrl: req.originalUrl,
                method: req.method,
                body: req.body,
                headers: req.headers,
                service,
            }, { accessKeyId, secretAccessKey }, user);
            Object.assign(req, { user });
            return Promise.resolve();
        })
            .then(next)
            .catch((error) => express_helper_1.ExpressHelper.errorHandler(error, res));
    };
}
exports.authentication = authentication;
//# sourceMappingURL=authentication.js.map