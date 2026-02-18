"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const documents_controller_1 = require("./documents.controller");
const documents_service_1 = require("./documents.service");
const document_render_queue_1 = require("./document-render.queue");
const document_storage_adapter_1 = require("./document-storage.adapter");
const local_storage_adapter_1 = require("./storage/local-storage.adapter");
let DocumentsModule = class DocumentsModule {
};
exports.DocumentsModule = DocumentsModule;
exports.DocumentsModule = DocumentsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [documents_controller_1.DocumentsController],
        providers: [
            documents_service_1.DocumentsService,
            local_storage_adapter_1.LocalStorageAdapter,
            document_render_queue_1.BullMqDocumentRenderQueue,
            {
                provide: document_storage_adapter_1.DOCUMENT_STORAGE_ADAPTER,
                useExisting: local_storage_adapter_1.LocalStorageAdapter,
            },
            {
                provide: document_render_queue_1.DOCUMENT_RENDER_QUEUE,
                useExisting: document_render_queue_1.BullMqDocumentRenderQueue,
            },
        ],
        exports: [documents_service_1.DocumentsService, document_storage_adapter_1.DOCUMENT_STORAGE_ADAPTER, document_render_queue_1.DOCUMENT_RENDER_QUEUE],
    })
], DocumentsModule);
//# sourceMappingURL=documents.module.js.map