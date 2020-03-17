"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const body_parser_1 = __importDefault(require("body-parser"));
const debug_1 = __importDefault(require("debug"));
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const index_1 = require("../index");
const test_env_1 = require("./test-env");
const app = express_1.default();
exports.app = app;
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use(body_parser_1.default.json({ type: 'text/plain' }));
app.use(body_parser_1.default.json());
app.use('/api', new index_1.MSQueue({ isMaster: true }).generateRoutes());
const server = http_1.default.createServer(app);
const log = debug_1.default('ms-queue:App');
server.listen(test_env_1.Env.PORT, '0.0.0.0', () => {
    log('Express server listening on %d, in test mode', test_env_1.Env.PORT);
});
//# sourceMappingURL=setup.js.map