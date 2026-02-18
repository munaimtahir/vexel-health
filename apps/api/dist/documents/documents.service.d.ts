import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { type DocumentRenderQueue } from './document-render.queue';
import { type DocumentStorageAdapter } from './document-storage.adapter';
import { type DocumentResponse } from './documents.types';
export declare class DocumentsService {
    private readonly prisma;
    private readonly cls;
    private readonly queue;
    private readonly storage;
    constructor(prisma: PrismaService, cls: ClsService, queue: DocumentRenderQueue, storage: DocumentStorageAdapter);
    private get tenantId();
    queueEncounterDocument(encounterId: string): Promise<DocumentResponse>;
    getDocumentById(documentId: string): Promise<DocumentResponse>;
    getDocumentFile(documentId: string): Promise<Buffer>;
    private findDocumentByIdForTenant;
    private buildEncounterSummaryPayload;
}
