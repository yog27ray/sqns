"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpressHelper = void 0;
const aws_xml_format_1 = require("../auth/aws-xml-format");
const s_q_n_s_error_1 = require("../auth/s-q-n-s-error");
const logger_1 = require("../logger/logger");
const log = logger_1.logger.instance('ExpressHelper');
class ExpressHelper {
    static requestHandler(callback) {
        return (request, response) => {
            callback(request, response)
                .catch((error) => {
                log.error(error);
                ExpressHelper.errorHandler(error, response);
            });
        };
    }
    static errorHandler(error, response) {
        if (error instanceof s_q_n_s_error_1.SQNSError) {
            const awsError = error;
            response.status(400).send(aws_xml_format_1.AwsXmlFormat.errorResponse(undefined, awsError.code, awsError.message, awsError.detail));
            return;
        }
        response.status(error.code || 400).send(aws_xml_format_1.AwsXmlFormat.errorResponse(undefined, `${error.code || 400}`, error.message));
    }
}
exports.ExpressHelper = ExpressHelper;
//# sourceMappingURL=express-helper.js.map