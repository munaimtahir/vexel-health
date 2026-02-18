import { OnModuleDestroy } from '@nestjs/common';
export declare const DOCUMENT_RENDER_QUEUE: unique symbol;
export declare const DOCUMENT_RENDER_QUEUE_NAME = "document-render-queue";
export type DocumentRenderJobPayload = {
    tenantId: string;
    documentId: string;
};
export interface DocumentRenderQueue {
    enqueueDocumentRender(payload: DocumentRenderJobPayload): Promise<void>;
}
export declare class BullMqDocumentRenderQueue implements DocumentRenderQueue, OnModuleDestroy {
    private queue;
    private getQueue;
    enqueueDocumentRender(payload: DocumentRenderJobPayload): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
