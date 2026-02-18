"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BullMqDocumentRenderQueue = exports.DOCUMENT_RENDER_QUEUE_NAME = exports.DOCUMENT_RENDER_QUEUE = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
exports.DOCUMENT_RENDER_QUEUE = Symbol('DOCUMENT_RENDER_QUEUE');
exports.DOCUMENT_RENDER_QUEUE_NAME = 'document-render-queue';
let BullMqDocumentRenderQueue = class BullMqDocumentRenderQueue {
    queue = null;
    getQueue() {
        if (this.queue) {
            return this.queue;
        }
        this.queue = new bullmq_1.Queue(exports.DOCUMENT_RENDER_QUEUE_NAME, {
            connection: {
                url: process.env.REDIS_URL ?? 'redis://localhost:6379',
            },
        });
        return this.queue;
    }
    async enqueueDocumentRender(payload) {
        await this.getQueue().add('DOCUMENT_RENDER', payload, {
            jobId: `${payload.tenantId}__${payload.documentId}`,
            attempts: 5,
            backoff: {
                type: 'exponential',
                delay: 1000,
            },
            removeOnComplete: 1000,
            removeOnFail: 1000,
        });
    }
    async onModuleDestroy() {
        if (this.queue) {
            await this.queue.close();
        }
    }
};
exports.BullMqDocumentRenderQueue = BullMqDocumentRenderQueue;
exports.BullMqDocumentRenderQueue = BullMqDocumentRenderQueue = __decorate([
    (0, common_1.Injectable)()
], BullMqDocumentRenderQueue);
//# sourceMappingURL=document-render.queue.js.map