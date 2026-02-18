import {
  Controller,
  Get,
  Param,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../common/guards/tenant.guard';
import { DocumentsService } from './documents.service';

@Controller('documents')
@UseGuards(TenantGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':documentId')
  getDocumentById(@Param('documentId') documentId: string) {
    return this.documentsService.getDocumentById(documentId);
  }

  @Get(':documentId/file')
  async getDocumentFile(@Param('documentId') documentId: string) {
    const bytes = await this.documentsService.getDocumentFile(documentId);
    return new StreamableFile(bytes, {
      type: 'application/pdf',
      disposition: `inline; filename="${documentId}.pdf"`,
      length: bytes.length,
    });
  }
}
