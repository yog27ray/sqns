"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const event_manager_1 = require("../event-manager");
const event_queue_1 = require("../event-manager/event-queue");
const master_config_1 = require("../scheduler-master/master-config");
const master_event_scheduler_1 = require("../scheduler-master/master-event-scheduler");
const slave_config_1 = require("../scheduler-slave/slave-config");
const container_1 = require("./container");
exports.container = container_1.container;
container_1.container.bind(event_manager_1.EventManager).to(event_manager_1.EventManager);
container_1.container.bind(event_queue_1.EventQueue).to(event_queue_1.EventQueue);
container_1.container.bind(master_event_scheduler_1.MasterEventScheduler).to(master_event_scheduler_1.MasterEventScheduler);
container_1.container.bind(slave_config_1.SlaveConfig).to(slave_config_1.SlaveConfig);
container_1.container.bind(master_config_1.MasterConfig).to(master_config_1.MasterConfig);
//# sourceMappingURL=index.js.map