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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRoutes = void 0;
const express = __importStar(require("express"));
const aws_authentication_1 = require("../../aws/aws-authentication");
const aws_to_server_transformer_1 = require("../../aws/aws-to-server-transformer");
const event_manager_master_1 = require("./event-manager-master");
function getSecretKey(accessKeyId) {
    return Promise.resolve({ secretAccessKey: 'secretAccessKeyTest', accessKeyId, accountId: '12345' });
}
function generateRoutes(eventManager) {
    const controller = new event_manager_master_1.EventManagerMaster(eventManager);
    const router = express.Router();
    router.get('/queue/health', (request, response) => {
        response.send('success');
    });
    router.get('/queues/events/stats', controller.eventStats());
    router.post('/sqs/queue/:queueName/event/:eventId/success', aws_authentication_1.awsAuthentication(getSecretKey), aws_to_server_transformer_1.AwsToServerTransformer.transformRequestBody(), controller.eventSuccess());
    router.post('/sqs/queue/:queueName/event/:eventId/failure', aws_authentication_1.awsAuthentication(getSecretKey), aws_to_server_transformer_1.AwsToServerTransformer.transformRequestBody(), controller.eventFailure());
    router.post('/sqs', aws_authentication_1.awsAuthentication(getSecretKey), aws_to_server_transformer_1.AwsToServerTransformer.transformRequestBody(), controller.sqs());
    return router;
}
exports.generateRoutes = generateRoutes;
//# sourceMappingURL=index.js.map