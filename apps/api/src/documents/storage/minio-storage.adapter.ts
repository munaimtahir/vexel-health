import {
  type DocumentStorageAdapter,
  type GetPdfInput,
  type PutPdfInput,
  type PutPdfResult,
} from '../document-storage.adapter';

// Placeholder for Phase 3B+.
// Planned envs:
// - DOCUMENTS_S3_ENDPOINT
// - DOCUMENTS_S3_BUCKET
// - DOCUMENTS_S3_ACCESS_KEY
// - DOCUMENTS_S3_SECRET_KEY
// - DOCUMENTS_S3_REGION
export class MinioStorageAdapter implements DocumentStorageAdapter {
  async putPdf(_input: PutPdfInput): Promise<PutPdfResult> {
    throw new Error('MinioStorageAdapter is not wired yet');
  }

  async getPdf(_input: GetPdfInput): Promise<Buffer> {
    throw new Error('MinioStorageAdapter is not wired yet');
  }
}
