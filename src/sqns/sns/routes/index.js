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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRoutes = void 0;
const express = __importStar(require("express"));
const authentication_1 = require("../../common/auth/authentication");
const aws_to_server_transformer_1 = require("../../common/auth/aws-to-server-transformer");
const s_n_s_controller_1 = require("./s-n-s-controller");
function generateRoutes(relativeURL, snsManager) {
    const controller = new s_n_s_controller_1.SNSController(relativeURL, snsManager);
    const router = express.Router();
    router.use('/sns/health', (request, response) => response.send('success'));
    router.get('/sns', aws_to_server_transformer_1.AwsToServerTransformer.transformRequestBody(), controller.snsGet());
    router.post('/sns', authentication_1.authentication(authentication_1.getSecretKey(snsManager.getStorageEngine())), aws_to_server_transformer_1.AwsToServerTransformer.transformRequestBody(), controller.sns());
    return router;
}
exports.generateRoutes = generateRoutes;
//# sourceMappingURL=index.js.map