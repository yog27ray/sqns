"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAuthorizationHash = exports.awsAuthentication = void 0;
const v4_js_1 = __importDefault(require("aws-sdk/lib/signers/v4.js"));
const crypto_1 = __importDefault(require("crypto"));
const moment_1 = __importDefault(require("moment"));
const express_helper_1 = require("../routes/master/express-helper");
const aws_error_1 = require("./aws-error");
function generateAuthorizationHash(accessKeyId, secretAccessKey, region, date, host, originalUrl, method, body) {
    const testRequest = {
        method,
        region,
        body: Object.keys(body).sort().map((key) => `${key}=${encodeURIComponent(body[key])}`).join('&'),
        search: () => '',
        pathname: () => originalUrl,
        headers: {
            'X-Amz-Content-Sha256': crypto_1.default.createHash('sha256')
                .update(Object.keys(body).sort().map((key) => `${key}=${encodeURIComponent(body[key])}`).join('&'), 'utf8')
                .digest('hex'),
            Host: host,
            Authorization: '',
        },
    };
    new v4_js_1.default(testRequest, 'sqs', { signatureCache: true, operation: {}, signatureVersion: 'v4' })
        .addAuthorization({ accessKeyId, secretAccessKey }, moment_1.default(date, 'YYYYMMDDTHHmmssZ').toDate());
    return testRequest.headers.Authorization;
}
exports.generateAuthorizationHash = generateAuthorizationHash;
function awsAuthentication(getSecretKey) {
    return (req, res, next) => {
        const [accessKey, , region] = req.header('Authorization')
            .split(' ')[1].split('=')[1].split('/');
        getSecretKey(accessKey)
            .then(({ accessKeyId, secretAccessKey, accountId }) => {
            const verificationHash = generateAuthorizationHash(accessKeyId, secretAccessKey, region, req.header('x-amz-date'), req.header('host'), req.originalUrl, req.method, req.body);
            const isTokenValid = req.header('Authorization') === verificationHash;
            if (isTokenValid) {
                Object.assign(req, { user: { accountId } });
                return next();
            }
            throw new aws_error_1.AwsError({
                code: 'SignatureDoesNotMatch',
                message: 'The request signature we calculated does not match the signature you provided.',
            });
        })
            .catch((error) => express_helper_1.ExpressHelper.errorHandler(error, res));
    };
}
exports.awsAuthentication = awsAuthentication;
//# sourceMappingURL=aws-authentication.js.map