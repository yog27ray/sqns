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
const inversify_1 = require("inversify");
const event_manager_1 = require("../../event-manager");
const m_s_error_1 = require("../../event-manager/m-s-error");
let EventManagerMaster = class EventManagerMaster {
    constructor(eventManager) {
        this.eventManager = eventManager;
    }
    requestHandler(req, res, callback) {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(async () => {
            try {
                await callback(req, res);
            }
            catch (error) {
                res.status(error.code || 400).json(error.message);
            }
        }, 0);
    }
    eventBulkNew(req, res) {
        this.requestHandler(req, res, () => {
            const { queueName } = req.params;
            let rows = req.body || [];
            if (rows.some((row) => !row.type)) {
                throw new m_s_error_1.MSError({ code: 400, message: 'Event type is missing for some items' });
            }
            rows = rows.map(({ type, data, id, priority }) => {
                const eventItem = new event_manager_1.EventItem({ type, data, id, priority });
                this.eventManager.add(queueName, eventItem);
                return eventItem.createResponse();
            });
            res.status(201).json(rows);
            return Promise.resolve();
        });
    }
    eventNew(req, res) {
        this.requestHandler(req, res, () => {
            const { body: { type, data, id, priority }, params: { queueName } } = req;
            if (!type) {
                throw new m_s_error_1.MSError({ code: 400, message: 'Event type is missing' });
            }
            const eventItem = new event_manager_1.EventItem({ type, data, id, priority });
            this.eventManager.add(queueName, eventItem);
            res.status(201).json(eventItem.createResponse());
            return Promise.resolve();
        });
    }
    eventStats(req, res) {
        this.requestHandler(req, res, () => {
            if (req.query.format === 'prometheus') {
                res.send(this.eventManager.prometheus);
                return;
            }
            res.json(this.eventManager.eventStats);
        });
    }
    eventPoll(req, res) {
        this.requestHandler(req, res, () => {
            const { queueName } = req.params;
            const eventItem = this.eventManager.poll(queueName);
            res.json(eventItem ? [eventItem] : []);
            return Promise.resolve();
        });
    }
    reset(req, res) {
        this.requestHandler(req, res, () => {
            const { queueName } = req.params;
            this.eventManager.reset(queueName);
            res.end();
            return Promise.resolve();
        });
    }
    resetAll(req, res) {
        this.requestHandler(req, res, () => {
            this.eventManager.resetAll();
            res.end();
            return Promise.resolve();
        });
    }
};
EventManagerMaster = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(event_manager_1.EventManager)),
    __metadata("design:paramtypes", [event_manager_1.EventManager])
], EventManagerMaster);
exports.EventManagerMaster = EventManagerMaster;
//# sourceMappingURL=event-manager-master.js.map