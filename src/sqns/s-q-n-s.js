"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQNS = void 0;
const s_q_n_s_error_1 = require("./common/auth/s-q-n-s-error");
const base_client_1 = require("./common/client/base-client");
const common_1 = require("./common/helper/common");
const logger_1 = require("./common/logger/logger");
const queue_1 = require("./common/model/queue");
const routes_1 = require("./common/routes");
const s_n_s_manager_1 = require("./sns/manager/s-n-s-manager");
const routes_2 = require("./sns/routes");
const s_q_s_manager_1 = require("./sqs/manager/s-q-s-manager");
const routes_3 = require("./sqs/routes");
const log = logger_1.logger.instance('SQNS');
class SQNS {
    constructor(config) {
        var _a, _b;
        log.info('Setting SQNS');
        if (!config.adminSecretKeys || !config.adminSecretKeys.length) {
            s_q_n_s_error_1.SQNSError.minAdminSecretKeys();
        }
        this._url = {
            host: config.endpoint.split('/').splice(0, 3).join('/'),
            basePath: `/${config.endpoint.split('/').splice(3, 100).join('/')}`,
            endpoint: config.endpoint,
        };
        this.region = base_client_1.BaseClient.REGION;
        if (!((_a = config.sqs) === null || _a === void 0 ? void 0 : _a.disable)) {
            log.info('Enable SQS');
            this.sqsManager = new s_q_s_manager_1.SQSManager({ endpoint: config.endpoint, db: config.db, ...(config.sqs || {}) }, config.adminSecretKeys);
        }
        if (!((_b = config.sns) === null || _b === void 0 ? void 0 : _b.disable)) {
            log.info('Enable SNS');
            this.snsManager = new s_n_s_manager_1.SNSManager({ endpoint: config.endpoint, db: config.db, ...(config.sns || {}) }, config.adminSecretKeys);
        }
    }
    queueComparator(queueARN, value) {
        this.sqsManager.comparatorFunction(queueARN, value);
    }
    registerExpressRoutes(app) {
        app.use(this._url.basePath, routes_1.generateRoutes());
        if (this.sqsManager) {
            app.use(this._url.basePath, routes_3.generateRoutes(this.sqsManager));
        }
        if (this.snsManager) {
            app.use(this._url.basePath, routes_2.generateRoutes(`${this._url.host}${this._url.basePath}`, this.snsManager));
        }
    }
    async resetAll() {
        this.sqsManager.resetAll();
        await Promise.all(common_1.RESERVED_QUEUE_NAME.map(async (queueName) => {
            const queue = await this.sqsManager.getQueue(queue_1.Queue.arn(undefined, this.region, queueName)).catch(() => undefined);
            if (!queue) {
                return;
            }
            await this.sqsManager.deleteQueue(queue);
        }));
    }
    cancel() {
        var _a;
        (_a = this.snsManager) === null || _a === void 0 ? void 0 : _a.cancel();
    }
}
exports.SQNS = SQNS;
//# sourceMappingURL=s-q-n-s.js.map