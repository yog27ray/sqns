"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const event_manager_1 = require("../event-manager");
const event_queue_1 = require("../event-manager/event-queue");
const collector_config_1 = require("../scheduler-collector/collector-config");
const collector_event_scheduler_1 = require("../scheduler-collector/collector-event-scheduler");
const processing_config_1 = require("../scheduler-processing/processing-config");
const container_1 = require("./container");
exports.container = container_1.container;
container_1.container.bind(event_manager_1.EventManager).to(event_manager_1.EventManager);
container_1.container.bind(collector_event_scheduler_1.CollectorEventScheduler).to(collector_event_scheduler_1.CollectorEventScheduler);
container_1.container.bind(processing_config_1.ProcessingConfig).to(processing_config_1.ProcessingConfig);
container_1.container.bind(collector_config_1.CollectorConfig).to(collector_config_1.CollectorConfig);
container_1.container.bind(event_queue_1.EventQueue).to(event_queue_1.EventQueue).inSingletonScope();
//# sourceMappingURL=index.js.map