"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Encryption = void 0;
const crypto_1 = __importDefault(require("crypto"));
class Encryption {
    static rfc3986EncodeURIComponent(str) {
        return encodeURIComponent(str).replace(/[!'()*]/g, escape);
    }
    static createHash(algorithm, text) {
        return crypto_1.default.createHash(algorithm).update(text, 'utf8').digest('hex');
    }
    static createHmac(algorithm, key, text) {
        return crypto_1.default.createHmac(algorithm, key).update(text, 'utf8').digest('hex');
    }
    static encodeNextToken(data) {
        return Buffer.from(JSON.stringify(data)).toString('base64');
    }
    static decodeNextToken(hash) {
        return JSON.parse(Buffer.from(hash, 'base64').toString());
    }
    static createJSONHash(algorithm, record) {
        const text = Encryption.createFlatRecord(record);
        return Encryption.createHash(algorithm, text);
    }
    static createJSONHmac(algorithm, key, record) {
        const text = Encryption.createFlatRecord(record);
        return Encryption.createHmac(algorithm, key, text);
    }
    static createFlatRecord(item) {
        if (typeof item !== 'object') {
            return Encryption.rfc3986EncodeURIComponent(item);
        }
        if (item instanceof Array) {
            return item.map((each) => Encryption.createFlatRecord(each)).join(',');
        }
        const record = item;
        return Object.keys(record).sort().map((key) => `${key}=${Encryption.createFlatRecord(record[key])}`).join('&');
    }
}
exports.Encryption = Encryption;
//# sourceMappingURL=encryption.js.map