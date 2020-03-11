"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const event_manager_master_1 = require("./event-manager-master");
const inversify_1 = require("../../inversify");
const controller = inversify_1.container.get(event_manager_master_1.EventManagerMaster);
const router = express.Router();
exports.router = router;
router.post('/queue/:queueName/event/bulk/new', (req, res) => controller.eventBulkNew(req, res));
router.post('/queue/:queueName/event/new', (req, res) => controller.eventNew(req, res));
router.post('/queue/:queueName/event/poll', (req, res) => controller.eventPoll(req, res));
router.get('/events/stats', (req, res) => controller.eventStats(req, res));
//# sourceMappingURL=index.js.map