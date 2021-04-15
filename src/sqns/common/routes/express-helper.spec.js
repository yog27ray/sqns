"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const express_helper_1 = require("./express-helper");
describe('EventHelperSpec', () => {
    context('errorHandling', () => {
        it('should handle error with and without code', async () => {
            let responseCode = 0;
            let responseMessage = '';
            const response = {
                status: (code) => {
                    responseCode = code;
                    return {
                        send: (message) => {
                            responseMessage = message;
                        },
                    };
                },
            };
            let error = new Error('Test error 1');
            error.code = 100;
            express_helper_1.ExpressHelper.errorHandler(error, response);
            chai_1.expect(responseCode).to.equal(100);
            chai_1.expect(responseMessage).to.equal('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
                + '<ErrorResponse>\n'
                + '  <RequestId/>\n'
                + '  <Error>\n'
                + '    <Type>Sender</Type>\n'
                + '    <Code>100</Code>\n'
                + '    <Message>Test error 1</Message>\n'
                + '    <Detail/>\n'
                + '  </Error>\n'
                + '</ErrorResponse>');
            error = new Error('Test error 2');
            express_helper_1.ExpressHelper.errorHandler(error, response);
            chai_1.expect(responseCode).to.equal(400);
            chai_1.expect(responseMessage).to.equal('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
                + '<ErrorResponse>\n'
                + '  <RequestId/>\n'
                + '  <Error>\n'
                + '    <Type>Sender</Type>\n'
                + '    <Code>400</Code>\n'
                + '    <Message>Test error 2</Message>\n'
                + '    <Detail/>\n'
                + '  </Error>\n'
                + '</ErrorResponse>');
        });
    });
});
//# sourceMappingURL=express-helper.spec.js.map