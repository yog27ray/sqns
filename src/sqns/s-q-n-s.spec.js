"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const setup_1 = require("../setup");
const s_q_n_s_1 = require("./s-q-n-s");
describe('SQNS', () => {
    context('error handling', () => {
        it('should give error when admin accessKey and secretKey is not provided', async () => {
            try {
                const sqns = new s_q_n_s_1.SQNS({ ...setup_1.setupConfig.sqnsConfig, adminSecretKeys: [] });
                await Promise.reject({ code: 99, message: 'should not reach here.', sqns });
            }
            catch (error) {
                const { code, message } = error;
                (0, chai_1.expect)({ code, message }).to.deep.equal({
                    code: 'MinAdminSecretKeys',
                    message: 'At-least one admin secret keys must be provided',
                });
            }
        });
    });
});
//# sourceMappingURL=s-q-n-s.spec.js.map