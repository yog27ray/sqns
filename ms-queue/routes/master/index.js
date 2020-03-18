"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = __importStar(require("express"));
const inversify_1 = require("../../inversify");
const event_manager_master_1 = require("./event-manager-master");
const controller = inversify_1.container.get(event_manager_master_1.EventManagerMaster);
const router = express.Router();
exports.router = router;
router.get('/queue/health', (req, res) => res.end());
router.post('/queue/:queueName/event/bulk/new', (req, res) => controller.eventBulkNew(req, res));
router.post('/queue/:queueName/event/new', (req, res) => controller.eventNew(req, res));
router.get('/queue/:queueName/event/poll', (req, res) => controller.eventPoll(req, res));
router.post('/queue/:queueName/reset', (req, res) => controller.reset(req, res));
router.post('/queues/reset', (req, res) => controller.resetAll(req, res));
router.get('/queues/events/stats', (req, res) => controller.eventStats(req, res));
//# sourceMappingURL=index.js.map