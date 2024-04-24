"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLogging = exports.logger = void 0;
const logger4node_1 = require("logger4node");
const logger = new logger4node_1.Logger4Node('sqns');
exports.logger = logger;
function updateLogging(logging) {
    if (!logging) {
        return;
    }
    if (logging.json) {
        logger.setJsonLogging(logging.json);
        return;
    }
    logger.setJsonLogging(false);
    if (logging.stringOnly) {
        logger.setStringLogging(logging.stringOnly);
        return;
    }
    logger.setStringLogging(false);
}
exports.updateLogging = updateLogging;
//# sourceMappingURL=logger.js.map