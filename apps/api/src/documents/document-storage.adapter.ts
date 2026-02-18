export const DOCUMENT_STORAGE_ADAPTER = Symbol('DOCUMENT_STORAGE_ADAPTER');

export type PutPdfInput = {
  tenantId: string;
  documentId: string;
  bytes: Buffer;
};

export type PutPdfResult = {
  storageKey: string;
};

export type GetPdfInput = {
  tenantId: string;
  storageKey: string;
};

export interface DocumentStorageAdapter {
  putPdf(input: PutPdfInput): Promise<PutPdfResult>;
  getPdf(input: GetPdfInput): Promise<Buffer>;
}
