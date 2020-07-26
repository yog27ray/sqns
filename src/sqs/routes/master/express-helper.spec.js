"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const express_helper_1 = require("./express-helper");
describe('EventHelperSpec', () => {
    context('errorHandling', () => {
        it('should handle error with and without code', async () => {
            let responseCode;
            let responseMessage;
            const response = {
                status: (code) => {
                    responseCode = code;
                    return {
                        json: (message) => {
                            responseMessage = message;
                        },
                    };
                },
            };
            let error = new Error('Test error 1');
            error.code = 100;
            express_helper_1.ExpressHelper.errorHandler(error, response);
            chai_1.expect(responseCode).to.equal(100);
            chai_1.expect(responseMessage).to.equal('Test error 1');
            error = new Error('Test error 2');
            express_helper_1.ExpressHelper.errorHandler(error, response);
            chai_1.expect(responseCode).to.equal(400);
            chai_1.expect(responseMessage).to.equal('Test error 2');
        });
    });
});
//# sourceMappingURL=express-helper.spec.js.map