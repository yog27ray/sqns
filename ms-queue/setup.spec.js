"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const request_promise_1 = __importDefault(require("request-promise"));
async function waitForServerToBoot() {
    return request_promise_1.default('http://localhost:1234/api/queue/health')
        .catch(() => new Promise((resolve) => waitForServerToBoot().then(() => resolve())));
}
describe('Server', () => {
    it('should respond to /', async () => {
        await waitForServerToBoot();
    });
});
//# sourceMappingURL=setup.spec.js.map