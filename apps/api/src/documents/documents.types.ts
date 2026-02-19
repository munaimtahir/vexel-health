import type { Document, DocumentStatus } from '@prisma/client';
import {
  type RequestedDocumentType,
  requestedTypeFromPayloadJson,
} from './document-types';

export type DocumentResponse = {
  id: string;
  type: RequestedDocumentType;
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

export function toDocumentResponse(document: Document): DocumentResponse {
  return {
    id: document.id,
    type: requestedTypeFromPayloadJson(document.payloadJson, document.documentType),
    status: document.status,
    encounterId: document.encounterId,
    payloadHash: document.payloadHash,
    pdfHash: document.pdfHash,
    payloadVersion: document.payloadVersion,
    templateVersion: document.templateVersion,
    createdAt: document.createdAt.toISOString(),
    renderedAt: document.renderedAt ? document.renderedAt.toISOString() : null,
    errorCode: document.errorCode,
    errorMessage: document.errorMessage,
  };
}
