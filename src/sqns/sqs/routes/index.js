"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
exports.generateRoutes = void 0;
const express = __importStar(require("express"));
const authentication_1 = require("../../common/auth/authentication");
const aws_to_server_transformer_1 = require("../../common/auth/aws-to-server-transformer");
const s_q_s_controller_1 = require("./s-q-s-controller");
function generateRoutes(sqsManager) {
    const controller = new s_q_s_controller_1.SQSController(sqsManager);
    const router = express.Router();
    router.get('/queue/health', (request, response) => {
        response.send('success');
    });
    router.get('/queues/events/stats', controller.eventStats());
    router.post('/sqs/:region/:companyId/:queueName/event/:eventId/success', (0, authentication_1.authentication)((0, authentication_1.getSecretKey)(sqsManager.getStorageEngine())), aws_to_server_transformer_1.AwsToServerTransformer.transformRequestBody(), controller.eventSuccess());
    router.post('/sqs/:region/:companyId/:queueName/event/:eventId/failure', (0, authentication_1.authentication)((0, authentication_1.getSecretKey)(sqsManager.getStorageEngine())), aws_to_server_transformer_1.AwsToServerTransformer.transformRequestBody(), controller.eventFailure());
    router.post('/sqs', (0, authentication_1.authentication)((0, authentication_1.getSecretKey)(sqsManager.getStorageEngine())), aws_to_server_transformer_1.AwsToServerTransformer.transformRequestBody(), controller.sqs());
    return router;
}
exports.generateRoutes = generateRoutes;
//# sourceMappingURL=index.js.map