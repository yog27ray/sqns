"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLogging = exports.logger = void 0;
const logger4node_1 = require("logger4node");
const logger = new logger4node_1.Logger4Node('sqns');
exports.logger = logger;
function updateLogging(logging = {}) {
    if (logging.json) {
        logger4node_1.Logger4Node.setJsonLogging(logging.json);
        return;
    }
    logger4node_1.Logger4Node.setJsonLogging(false);
    if (logging.stringOnly) {
        logger4node_1.Logger4Node.setOnlyStringLogging(logging.stringOnly);
        return;
    }
    logger4node_1.Logger4Node.setOnlyStringLogging(false);
}
exports.updateLogging = updateLogging;
//# sourceMappingURL=logger.js.map