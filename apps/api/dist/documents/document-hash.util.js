"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalizeJson = canonicalizeJson;
exports.sha256HexFromText = sha256HexFromText;
exports.sha256HexFromBytes = sha256HexFromBytes;
const node_crypto_1 = require("node:crypto");
function normalizeValue(value) {
    if (Array.isArray(value)) {
        return value.map((item) => normalizeValue(item));
    }
    if (value && typeof value === 'object') {
        const record = value;
        const sortedKeys = Object.keys(record).sort();
        const normalized = {};
        for (const key of sortedKeys) {
            normalized[key] = normalizeValue(record[key]);
        }
        return normalized;
    }
    return value;
}
function canonicalizeJson(value) {
    return JSON.stringify(normalizeValue(value));
}
function sha256HexFromText(value) {
    return (0, node_crypto_1.createHash)('sha256').update(value).digest('hex');
}
function sha256HexFromBytes(value) {
    return (0, node_crypto_1.createHash)('sha256').update(value).digest('hex');
}
//# sourceMappingURL=document-hash.util.js.map