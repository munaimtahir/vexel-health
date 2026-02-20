import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogAuditService } from './catalog-audit.service';
import { CatalogImportExportService } from './catalog-import-export.service';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, CatalogAuditService, CatalogImportExportService],
  exports: [CatalogService, CatalogAuditService, CatalogImportExportService],
})
export class CatalogModule {}
