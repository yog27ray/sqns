"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Encryption = void 0;
const crypto_1 = __importDefault(require("crypto"));
class Encryption {
    static createHash(algorithm, text) {
        return crypto_1.default.createHash(algorithm).update(text, 'utf8').digest('hex');
    }
    static encodeNextToken(data) {
        return Buffer.from(JSON.stringify(data)).toString('base64');
    }
    static decodeNextToken(hash) {
        return JSON.parse(Buffer.from(hash, 'base64').toString());
    }
}
exports.Encryption = Encryption;
//# sourceMappingURL=encryption.js.map