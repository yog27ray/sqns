"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = exports.dropDatabase = exports.setupConfig = exports.app = void 0;
const body_parser_1 = __importDefault(require("body-parser"));
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
// import morgan from 'morgan';
const index_1 = require("../index");
const database_1 = require("./sqns/common/database");
const mongo_d_b_connection_1 = require("./sqns/common/database/mongodb/mongo-d-b-connection");
const logger_1 = require("./sqns/common/logger/logger");
const base_storage_engine_1 = require("./sqns/common/model/base-storage-engine");
const request_client_1 = require("./sqns/common/request-client/request-client");
const test_env_1 = require("./test-env");
const log = logger_1.logger.instance('TestServer');
const app = (0, express_1.default)();
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
    return new Promise((resolve) => {
        setTimeout(resolve, milliSeconds);
    });
}
exports.delay = delay;
const requestClient = new request_client_1.RequestClient();
function waitForServerToBoot() {
    return requestClient.get(`http://127.0.0.1:${test_env_1.Env.PORT}/api/sqns/health`).catch(async () => {
        await delay();
        return waitForServerToBoot();
    });
}
async function dropDatabase() {
    await setupConfig.mongoConnection.dropDatabase();
    await setupConfig.sqns.resetAll();
    const storageAdapter = new base_storage_engine_1.BaseStorageEngine(databaseConfig);
    await setupConfig.mongoConnection.collection(storageAdapter.getDBTableName('Event'))
        .createIndex({ MessageDeduplicationId: 1 }, {
        unique: true,
        partialFilterExpression: { MessageDeduplicationId: { $exists: true } },
    });
    await storageAdapter.initialize([{
            accessKey: test_env_1.Env.accessKeyId,
            secretAccessKey: test_env_1.Env.secretAccessKey,
        }]);
    const sqnsClient = new index_1.SQNSClient({
        endpoint: `${test_env_1.Env.URL}/api`,
        accessKeyId: test_env_1.Env.accessKeyId,
        secretAccessKey: test_env_1.Env.secretAccessKey,
    });
    await (0, test_env_1.deleteAllQueues)(sqnsClient, storageAdapter, setupConfig.mongoConnection);
    await (0, test_env_1.deleteTopics)(sqnsClient, storageAdapter);
}
exports.dropDatabase = dropDatabase;
before(async () => {
    log.info('TestDB URI:', process.env.MONGODB_URI);
    databaseConfig = {
        database: database_1.Database.MONGO_DB,
        uri: process.env.MONGODB_URI,
        config: {},
    };
    // eslint-disable-next-line no-console
    console.log('>>:', databaseConfig);
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