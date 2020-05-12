"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const request_promise_1 = __importDefault(require("request-promise"));
const test_env_1 = require("./test-env");
async function waitForServerToBoot() {
    return request_promise_1.default(`http://localhost:${test_env_1.Env.PORT}/api/queue/health`)
        // eslint-disable-next-line promise/no-nesting
        .catch(() => new Promise((resolve) => waitForServerToBoot().then(() => resolve())));
}
describe('Server', () => {
    it('should respond to /', async () => {
        await waitForServerToBoot();
    });
});
//# sourceMappingURL=setup.spec.js.map