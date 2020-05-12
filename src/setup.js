"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const body_parser_1 = __importDefault(require("body-parser"));
const debug_1 = __importDefault(require("debug"));
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
const index_1 = require("../index");
const mongo_d_b_connection_1 = require("./storage/mongodb/mongo-d-b-connection");
const test_env_1 = require("./test-env");
const log = debug_1.default('ms-queue:TestServer');
const app = express_1.default();
exports.app = app;
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use(body_parser_1.default.json({ type: 'text/plain' }));
app.use(body_parser_1.default.json());
let queueConfig;
if (process.env.TEST_DB === 'mongoDB') {
    const mongod = new mongodb_memory_server_1.MongoMemoryServer({ instance: { dbName: 'msQueue', port: 27020 } });
    mongod.getUri().catch((error) => log(error));
    queueConfig = { database: index_1.MSQueue.Database.MONGO_DB, config: { uri: 'mongodb://127.0.0.1:27020/msQueue' } };
}
else {
    queueConfig = { config: {} };
}
const mSQueue = new index_1.MSQueue(queueConfig);
exports.mSQueue = mSQueue;
const mongoConnection = new mongo_d_b_connection_1.MongoDBConnection(queueConfig.config.uri, {});
exports.mongoConnection = mongoConnection;
app.use('/api', mSQueue.generateRoutes());
const server = http_1.default.createServer(app);
if (process.env.PORT) {
    test_env_1.Env.PORT = Number(process.env.PORT);
    test_env_1.Env.URL = `http://localhost:${test_env_1.Env.PORT}`;
}
server.listen(test_env_1.Env.PORT, '0.0.0.0', () => {
    log('Express server listening on %d, in test mode', test_env_1.Env.PORT);
});
//# sourceMappingURL=setup.js.map