import { type DocumentStorageAdapter, type GetPdfInput, type PutPdfInput, type PutPdfResult } from '../document-storage.adapter';
export declare class MinioStorageAdapter implements DocumentStorageAdapter {
    putPdf(_input: PutPdfInput): Promise<PutPdfResult>;
    getPdf(_input: GetPdfInput): Promise<Buffer>;
}
