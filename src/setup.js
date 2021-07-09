"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = exports.dropDatabase = exports.setupConfig = exports.app = void 0;
const body_parser_1 = __importDefault(require("body-parser"));
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
// import morgan from 'morgan';
const index_1 = require("../index");
const database_1 = require("./sqns/common/database");
const mongo_d_b_connection_1 = require("./sqns/common/database/mongodb/mongo-d-b-connection");
const logger_1 = require("./sqns/common/logger/logger");
const base_storage_engine_1 = require("./sqns/common/model/base-storage-engine");
const request_client_1 = require("./sqns/common/request-client/request-client");
const test_env_1 = require("./test-env");
const log = logger_1.logger.instance('TestServer');
const app = express_1.default();
exports.app = app;
// app.use(morgan('dev'));
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use(body_parser_1.default.json({ type: 'text/plain' }));
app.use(body_parser_1.default.json());
let databaseConfig;
const setupConfig = {};
exports.setupConfig = setupConfig;
if (process.env.PORT) {
    test_env_1.Env.PORT = Number(process.env.PORT);
    test_env_1.Env.URL = `http://127.0.0.1:${test_env_1.Env.PORT}`;
}
function delay(milliSeconds = 100) {
    return new Promise((resolve) => setTimeout(resolve, milliSeconds));
}
exports.delay = delay;
async function dropDatabase() {
    await setupConfig.mongoConnection.dropDatabase();
    await setupConfig.sqns.resetAll();
    const storageAdapter = new base_storage_engine_1.BaseStorageEngine(databaseConfig);
    await storageAdapter.initialize([{
            accessKey: test_env_1.Env.accessKeyId,
            secretAccessKey: test_env_1.Env.secretAccessKey,
        }]);
    const sqnsClient = new index_1.SQNSClient({
        endpoint: `${test_env_1.Env.URL}/api`,
        accessKeyId: test_env_1.Env.accessKeyId,
        secretAccessKey: test_env_1.Env.secretAccessKey,
    });
    await test_env_1.deleteAllQueues(sqnsClient);
    await test_env_1.deleteTopics(sqnsClient);
}
exports.dropDatabase = dropDatabase;
const requestClient = new request_client_1.RequestClient();
function waitForServerToBoot() {
    return requestClient.get(`http://127.0.0.1:${test_env_1.Env.PORT}/api/sqns/health`).catch(async () => {
        await delay();
        return waitForServerToBoot();
    });
}
before(async () => {
    const mongoDB = await mongodb_memory_server_1.MongoMemoryServer.create({ instance: { dbName: 'sqns' } });
    const uri = `${mongoDB.getUri()}/sqns`;
    log.info('TestDB URI:', uri);
    databaseConfig = { database: database_1.Database.MONGO_DB, uri, config: { useUnifiedTopology: true } };
    setupConfig.mongoConnection = new mongo_d_b_connection_1.MongoDBConnection(databaseConfig.uri, databaseConfig.config);
    setupConfig.sqnsConfig = {
        adminSecretKeys: [{ accessKey: test_env_1.Env.accessKeyId, secretAccessKey: test_env_1.Env.secretAccessKey }],
        endpoint: `http://127.0.0.1:${test_env_1.Env.PORT}/api`,
        db: databaseConfig,
    };
    setupConfig.sqns = new index_1.SQNS(setupConfig.sqnsConfig);
    setupConfig.sqns.cancel();
    setupConfig.sqns.registerExpressRoutes(app);
    const server = http_1.default.createServer(app);
    server.listen(test_env_1.Env.PORT, '0.0.0.0', () => {
        log.info('Express server listening on %d, in test mode', test_env_1.Env.PORT);
    });
    await waitForServerToBoot();
});
//# sourceMappingURL=setup.js.map