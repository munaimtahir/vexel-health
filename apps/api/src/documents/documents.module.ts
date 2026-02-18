import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import {
  BullMqDocumentRenderQueue,
  DOCUMENT_RENDER_QUEUE,
} from './document-render.queue';
import { DOCUMENT_STORAGE_ADAPTER } from './document-storage.adapter';
import { LocalStorageAdapter } from './storage/local-storage.adapter';

@Module({
  imports: [PrismaModule],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    LocalStorageAdapter,
    BullMqDocumentRenderQueue,
    {
      provide: DOCUMENT_STORAGE_ADAPTER,
      useExisting: LocalStorageAdapter,
    },
    {
      provide: DOCUMENT_RENDER_QUEUE,
      useExisting: BullMqDocumentRenderQueue,
    },
  ],
  exports: [DocumentsService, DOCUMENT_STORAGE_ADAPTER, DOCUMENT_RENDER_QUEUE],
})
export class DocumentsModule {}
