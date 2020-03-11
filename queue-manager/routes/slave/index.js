"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const router = express.Router();
exports.router = router;
router.post('/*', (req, res) => {
    res.status(404).json({ message: 'Api only supported for master node.' });
});
//# sourceMappingURL=index.js.map