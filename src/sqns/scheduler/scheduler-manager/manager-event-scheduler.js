"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManagerEventScheduler = void 0;
const schedule = __importStar(require("node-schedule"));
const logger_1 = require("../../common/logger/logger");
const s_q_n_s_client_1 = require("../../s-q-n-s-client");
const manager_queue_config_1 = require("./manager-queue-config");
const log = logger_1.logger.instance('sqns:ManagerEventScheduler');
class ManagerEventScheduler {
    constructor(options, queueBaseParams, listener, cronInterval) {
        this.queueNames = Object.keys(queueBaseParams);
        this.queueConfigs = {};
        this.queueNames.forEach((queueName) => {
            const mangerConfig = new manager_queue_config_1.ManagerQueueConfig(queueName);
            mangerConfig.listener = listener;
            mangerConfig.queryBaseParams = queueBaseParams[queueName];
            this.queueConfigs[queueName] = mangerConfig;
        });
        this.client = new s_q_n_s_client_1.SQNSClient(options);
        this.initialize(cronInterval);
    }
    cancel() {
        this.job.cancel();
    }
    async findOrCreateQueue(queueConfig_) {
        const queueConfig = queueConfig_;
        if (queueConfig.queue) {
            return;
        }
        queueConfig.queue = await this.client.createQueue({ QueueName: queueConfig.queueName });
    }
    initialize(cronInterval = '* * * * *') {
        log.info('Adding scheduler job for event master.');
        this.job = schedule.scheduleJob(cronInterval, () => this.queueNames
            .filter((queueName) => !this.queueConfigs[queueName].sending)
            .forEach((queueName) => this
            .requestEventsToAddInQueueAsynchronous(this.queueConfigs[queueName], this.queueConfigs[queueName].cloneBaseParams)));
    }
    requestEventsToAddInQueueAsynchronous(queueConfig_, itemListParams) {
        const queueConfig = queueConfig_;
        queueConfig.sending = true;
        this.requestEventsToAddInQueue(queueConfig, itemListParams)
            .catch((error) => {
            log.error(error);
            queueConfig.sending = false;
        });
    }
    async requestEventsToAddInQueue(queueConfig_, itemListParams) {
        const queueConfig = queueConfig_;
        const [nextItemListParams, items] = await queueConfig.listener(queueConfig.queueName, itemListParams);
        if (!items.length) {
            queueConfig.sending = false;
            return;
        }
        await this.findOrCreateQueue(queueConfig);
        await this.client.sendMessageBatch({
            QueueUrl: queueConfig.queue.QueueUrl,
            Entries: items.map((entry, index) => ({
                Id: `${index + 1}`,
                MessageBody: entry.MessageBody,
                DelaySeconds: entry.DelaySeconds,
                MessageAttributes: entry.MessageAttributes,
                MessageSystemAttributes: entry.MessageSystemAttributes,
                MessageDeduplicationId: entry.MessageDeduplicationId,
                MessageGroupId: entry.MessageGroupId,
            })),
        });
        this.requestEventsToAddInQueueAsynchronous(queueConfig, nextItemListParams);
    }
}
exports.ManagerEventScheduler = ManagerEventScheduler;
//# sourceMappingURL=manager-event-scheduler.js.map