"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = require("debug");
const request_promise_1 = require("request-promise");
const node_schedule_1 = require("node-schedule");
const master_config_1 = require("./master-config");
const queue_manager_config_1 = require("../event-manager/queue-manager-config");
const inversify_1 = require("../inversify");
const log = debug_1.default('queue-manager:EventScheduler');
class MasterEventScheduler {
    constructor(queueName, baseParams, listener, cronInterval) {
        this.queueName = queueName;
        this.config = inversify_1.container.get(master_config_1.MasterConfig);
        this.queueManagerConfig = inversify_1.container.get(queue_manager_config_1.QueueManagerConfig);
        this.config.listener = listener;
        this.config.baseParams = baseParams;
        this.initialize(cronInterval);
    }
    initialize(cronInterval = '* * * * *') {
        this.requestEventsToAddInQueue(this.cloneBaseParams);
        if (process.env.NODE_ENV === 'test') {
            return;
        }
        log('Adding scheduler job for event master.');
        node_schedule_1.default.scheduleJob(cronInterval, () => !this.config.sending && this.requestEventsToAddInQueue(this.cloneBaseParams));
    }
    get cloneBaseParams() {
        return JSON.parse(JSON.stringify(this.config.baseParams));
    }
    requestEventsToAddInQueue(itemListParams) {
        this.config.sending = true;
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(async () => {
            try {
                const [nextItemListParams, items] = await this.config.listener(itemListParams);
                if (!items.length) {
                    this.config.sending = false;
                    return;
                }
                await request_promise_1.default({
                    method: 'POST',
                    uri: `${this.queueManagerConfig.masterURL}/queue/${this.queueName}/event/bulk/new`,
                    body: items.map((item) => item.toRequestBody()),
                    json: true,
                })
                    .catch(async (error) => {
                    if (!error.code && error.message.startsWith('Error: connect ECONNREFUSED')) {
                        // eslint-disable-next-line no-console
                        console.log(error.message);
                        return;
                    }
                    await Promise.reject(error);
                });
                this.requestEventsToAddInQueue(nextItemListParams);
            }
            catch (error) {
                log(error);
                this.config.sending = false;
            }
        }, 0);
    }
}
exports.MasterEventScheduler = MasterEventScheduler;
//# sourceMappingURL=master-event-scheduler.js.map