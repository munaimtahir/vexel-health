import { Module } from '@nestjs/common';
import { LabAdminCatalogController } from './lab-admin-catalog.controller';
import { LabAdminCatalogService } from './lab-admin-catalog.service';
import { LabCatalogController } from './lab-catalog.controller';
import { LabCatalogService } from './lab-catalog.service';

@Module({
  controllers: [LabCatalogController, LabAdminCatalogController],
  providers: [LabCatalogService, LabAdminCatalogService],
  exports: [LabCatalogService, LabAdminCatalogService],
})
export class LabCatalogModule {}
