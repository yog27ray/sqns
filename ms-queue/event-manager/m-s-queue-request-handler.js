"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const request_promise_1 = __importDefault(require("request-promise"));
const event_item_1 = require("./event-item");
class MSQueueRequestHandler {
    addEventsToQueue(hostName, queueName, events) {
        return request_promise_1.default({
            method: 'POST',
            uri: `${hostName}/queue/${queueName}/event/bulk/new`,
            body: events.map((item) => item.toRequestBody()),
            json: true,
        });
    }
    async fetchEventsFromQueue(hostName, queueName) {
        const [response] = await request_promise_1.default({
            uri: `${hostName}/queue/${queueName}/event/poll`,
            json: true,
        });
        if (!response) {
            return undefined;
        }
        return new event_item_1.EventItem(response);
    }
}
exports.MSQueueRequestHandler = MSQueueRequestHandler;
//# sourceMappingURL=m-s-queue-request-handler.js.map