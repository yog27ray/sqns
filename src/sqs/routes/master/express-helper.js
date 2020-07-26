"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpressHelper = void 0;
const aws_error_1 = require("../../aws/aws-error");
const aws_xml_format_1 = require("../../aws/aws-xml-format");
class ExpressHelper {
    static requestHandler(callback) {
        return (request, response) => {
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            setTimeout(async () => {
                try {
                    await callback(request, response);
                }
                catch (error) {
                    ExpressHelper.errorHandler(error, response);
                }
            }, 0);
        };
    }
    static errorHandler(error, response) {
        if (error instanceof aws_error_1.AwsError) {
            const awsError = error;
            response.status(400).send(aws_xml_format_1.AwsXmlFormat.errorResponse(awsError.code, awsError.message, awsError.detail));
            return;
        }
        response.status(error.code || 400).json(error.message);
    }
}
exports.ExpressHelper = ExpressHelper;
//# sourceMappingURL=express-helper.js.map