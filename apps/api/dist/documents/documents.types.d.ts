import type { Document, DocumentStatus, DocumentType } from '@prisma/client';
export type DocumentResponse = {
    id: string;
    type: DocumentType;
    status: DocumentStatus;
    encounterId: string;
    payloadHash: string;
    pdfHash: string | null;
    payloadVersion: number;
    templateVersion: number;
    createdAt: string;
    renderedAt: string | null;
    errorCode: string | null;
    errorMessage: string | null;
};
export declare function toDocumentResponse(document: Document): DocumentResponse;
