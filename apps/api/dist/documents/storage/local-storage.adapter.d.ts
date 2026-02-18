import { type DocumentStorageAdapter, type GetPdfInput, type PutPdfInput, type PutPdfResult } from '../document-storage.adapter';
export declare class LocalStorageAdapter implements DocumentStorageAdapter {
    private readonly baseDir;
    putPdf(input: PutPdfInput): Promise<PutPdfResult>;
    getPdf(input: GetPdfInput): Promise<Buffer>;
    private buildStorageKey;
    private resolveStoragePath;
}
