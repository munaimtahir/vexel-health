import { Injectable } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import {
  type DocumentStorageAdapter,
  type GetPdfInput,
  type PutPdfInput,
  type PutPdfResult,
} from '../document-storage.adapter';

@Injectable()
export class LocalStorageAdapter implements DocumentStorageAdapter {
  private readonly baseDir =
    process.env.DOCUMENTS_LOCAL_DIR?.trim() || '/data/documents';

  async putPdf(input: PutPdfInput): Promise<PutPdfResult> {
    const storageKey = this.buildStorageKey(input.tenantId, input.documentId);
    const targetPath = this.resolveStoragePath(storageKey, input.tenantId);

    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, input.bytes);

    return { storageKey };
  }

  async getPdf(input: GetPdfInput): Promise<Buffer> {
    const sourcePath = this.resolveStoragePath(input.storageKey, input.tenantId);
    return readFile(sourcePath);
  }

  private buildStorageKey(tenantId: string, documentId: string): string {
    return `${tenantId}/${documentId}.pdf`;
  }

  private resolveStoragePath(storageKey: string, tenantId: string): string {
    const normalizedKey = normalize(storageKey).replace(/^([/\\])+/, '');
    const tenantPrefix = `${tenantId}${sep}`;

    if (!normalizedKey.startsWith(tenantPrefix)) {
      throw new Error('storage key does not belong to tenant');
    }

    const rootPath = resolve(this.baseDir);
    const absolutePath = resolve(join(rootPath, normalizedKey));

    if (!absolutePath.startsWith(`${rootPath}${sep}`) && absolutePath !== rootPath) {
      throw new Error('invalid storage path');
    }

    return absolutePath;
  }
}
