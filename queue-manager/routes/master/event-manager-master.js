"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = require("debug");
const inversify_1 = require("inversify");
const event_manager_1 = require("../../event-manager");
const log = debug_1.default('queue-manager:Route');
let EventManagerMaster = class EventManagerMaster {
    constructor(eventManager) {
        this.eventManager = eventManager;
    }
    eventBulkNew(req, res) {
        try {
            const { queueName } = req.params;
            let rows = req.body || [];
            if (rows.some((row) => !row.type)) {
                res.status(400).json({ message: 'Event type is missing for some items' });
                return;
            }
            rows = rows.map(({ type, data, id, priority }) => {
                const eventItem = new event_manager_1.EventItem({ type, data, id, priority });
                this.eventManager.add(queueName, eventItem);
                return eventItem.createResponse();
            });
            res.status(201).json(rows);
        }
        catch (error) {
            res.status(error.code || 400).json(error.message);
        }
    }
    eventNew(req, res) {
        try {
            const { body: { type, data, id, priority }, params: { queueName } } = req;
            if (!type) {
                res.status(400).json({ message: 'Event type is missing' });
                return;
            }
            const eventItem = new event_manager_1.EventItem({ type, data, id, priority });
            this.eventManager.add(queueName, eventItem);
            res.status(201).json(eventItem.createResponse());
        }
        catch (error) {
            res.status(error.code || 400).json(error.message);
        }
    }
    eventStats(req, res) {
        try {
            if (req.query.format === 'prometheus') {
                res.send(this.eventManager.prometheus);
                return;
            }
            res.json(this.eventManager.eventStats);
        }
        catch (error) {
            res.status(error.code || 400).json(error.message);
        }
    }
    eventPoll(req, res) {
        try {
            const { queueName } = req.params;
            const eventItem = this.eventManager.poll(queueName);
            res.json(eventItem ? [eventItem] : []);
        }
        catch (error) {
            res.status(error.code || 400).json(error.message);
        }
    }
};
EventManagerMaster = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(event_manager_1.EventManager)),
    __metadata("design:paramtypes", [event_manager_1.EventManager])
], EventManagerMaster);
exports.EventManagerMaster = EventManagerMaster;
//# sourceMappingURL=event-manager-master.js.map