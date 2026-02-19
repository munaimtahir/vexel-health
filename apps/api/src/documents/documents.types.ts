import type { Document, DocumentStatus } from '@prisma/client';
import {
  type RequestedDocumentType,
  requestedTypeFromPayloadJson,
  templateKeyFromPayloadJson,
} from './document-types';

export type DocumentResponse = {
  id: string;
  type: RequestedDocumentType;
  templateKey: string;
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
  const requestedType = requestedTypeFromPayloadJson(
    document.payloadJson,
    document.documentType,
  );

  return {
    id: document.id,
    type: requestedType,
    templateKey: templateKeyFromPayloadJson(document.payloadJson, requestedType),
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
