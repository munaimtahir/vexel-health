import { StreamableFile } from '@nestjs/common';
import { DocumentsService } from './documents.service';
export declare class DocumentsController {
    private readonly documentsService;
    constructor(documentsService: DocumentsService);
    getDocumentById(documentId: string): Promise<import("./documents.types").DocumentResponse>;
    getDocumentFile(documentId: string): Promise<StreamableFile>;
}
