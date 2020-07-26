"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueConfig = exports.delay = exports.mongoConnection = exports.dropDatabase = exports.simpleQueueServer = exports.app = void 0;
const body_parser_1 = __importDefault(require("body-parser"));
const debug_1 = __importDefault(require("debug"));
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
// import morgan from 'morgan';
const request_promise_1 = __importDefault(require("request-promise"));
const index_1 = require("../index");
const mongo_d_b_connection_1 = require("./sqs/storage/mongodb/mongo-d-b-connection");
const test_env_1 = require("./test-env");
const log = debug_1.default('ms-queue:TestServer');
const app = express_1.default();
exports.app = app;
// app.use(morgan('dev'));
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use(body_parser_1.default.json({ type: 'text/plain' }));
app.use(body_parser_1.default.json());
const queueConfig = { config: {} };
exports.queueConfig = queueConfig;
if (process.env.TEST_DB === 'mongoDB') {
    const mongoDB = new mongodb_memory_server_1.MongoMemoryServer({ instance: { dbName: 'msQueue', port: 27020 } });
    mongoDB.getUri().catch((error) => log(error));
    queueConfig.database = index_1.SimpleQueueServer.Database.MONGO_DB;
    queueConfig.config = { uri: 'mongodb://127.0.0.1:27020/msQueue' };
}
const simpleQueueServer = new index_1.SimpleQueueServer(queueConfig);
exports.simpleQueueServer = simpleQueueServer;
simpleQueueServer.cancel();
const mongoConnection = new mongo_d_b_connection_1.MongoDBConnection(queueConfig.config.uri, {});
exports.mongoConnection = mongoConnection;
app.use('/api', simpleQueueServer.generateRoutes());
const server = http_1.default.createServer(app);
if (process.env.PORT) {
    test_env_1.Env.PORT = Number(process.env.PORT);
    test_env_1.Env.URL = `http://localhost:${test_env_1.Env.PORT}`;
}
server.listen(test_env_1.Env.PORT, '0.0.0.0', () => {
    log('Express server listening on %d, in test mode', test_env_1.Env.PORT);
});
function delay(milliSeconds = 100) {
    return new Promise((resolve) => setTimeout(resolve, milliSeconds));
}
exports.delay = delay;
async function dropDatabase() {
    await mongoConnection.dropDatabase();
    await simpleQueueServer.resetAll();
}
exports.dropDatabase = dropDatabase;
async function waitForServerToBoot() {
    await request_promise_1.default(`http://localhost:${test_env_1.Env.PORT}/api/queue/health`).catch(async () => {
        await delay();
        return waitForServerToBoot();
    });
}
before(async () => {
    await waitForServerToBoot();
});
//# sourceMappingURL=setup.js.map