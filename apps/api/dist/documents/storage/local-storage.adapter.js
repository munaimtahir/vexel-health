"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageAdapter = void 0;
const common_1 = require("@nestjs/common");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
let LocalStorageAdapter = class LocalStorageAdapter {
    baseDir = process.env.DOCUMENTS_LOCAL_DIR?.trim() || '/data/documents';
    async putPdf(input) {
        const storageKey = this.buildStorageKey(input.tenantId, input.documentId);
        const targetPath = this.resolveStoragePath(storageKey, input.tenantId);
        await (0, promises_1.mkdir)((0, node_path_1.dirname)(targetPath), { recursive: true });
        await (0, promises_1.writeFile)(targetPath, input.bytes);
        return { storageKey };
    }
    async getPdf(input) {
        const sourcePath = this.resolveStoragePath(input.storageKey, input.tenantId);
        return (0, promises_1.readFile)(sourcePath);
    }
    buildStorageKey(tenantId, documentId) {
        return `${tenantId}/${documentId}.pdf`;
    }
    resolveStoragePath(storageKey, tenantId) {
        const normalizedKey = (0, node_path_1.normalize)(storageKey).replace(/^([/\\])+/, '');
        const tenantPrefix = `${tenantId}${node_path_1.sep}`;
        if (!normalizedKey.startsWith(tenantPrefix)) {
            throw new Error('storage key does not belong to tenant');
        }
        const rootPath = (0, node_path_1.resolve)(this.baseDir);
        const absolutePath = (0, node_path_1.resolve)((0, node_path_1.join)(rootPath, normalizedKey));
        if (!absolutePath.startsWith(`${rootPath}${node_path_1.sep}`) && absolutePath !== rootPath) {
            throw new Error('invalid storage path');
        }
        return absolutePath;
    }
};
exports.LocalStorageAdapter = LocalStorageAdapter;
exports.LocalStorageAdapter = LocalStorageAdapter = __decorate([
    (0, common_1.Injectable)()
], LocalStorageAdapter);
//# sourceMappingURL=local-storage.adapter.js.map