"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const setup_1 = require("../../../setup");
const base_storage_engine_1 = require("../model/base-storage-engine");
const authentication_1 = require("./authentication");
const s_q_n_s_error_1 = require("./s-q-n-s-error");
describe('Authentication', () => {
    context('getSecretKey', () => {
        class TempStorageEngine extends base_storage_engine_1.BaseStorageEngine {
            findAccessKey() {
                return Promise.reject(new s_q_n_s_error_1.SQNSError({
                    code: 'DatabaseError',
                    message: 'Database find error.',
                }));
            }
        }
        it('should handle error while fetching key from database.', async () => {
            try {
                await authentication_1.getSecretKey(new TempStorageEngine(setup_1.setupConfig.sqnsConfig.db, []))('dbAccessErrorKey');
                await Promise.reject({ code: 99, message: 'should not reach here.' });
            }
            catch (error) {
                const { code, message } = error;
                chai_1.expect({ code, message }).deep.equal({ code: 'DatabaseError', message: 'Database find error.' });
            }
        });
    });
});
//# sourceMappingURL=authentication.spec.js.map