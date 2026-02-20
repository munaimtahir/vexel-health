import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PERMISSIONS } from '../auth/permissions.constants';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CatalogService } from './catalog.service';
import { CatalogAuditService } from './catalog-audit.service';
import { CatalogImportExportService } from './catalog-import-export.service';

@Controller('catalog')
@UseGuards(TenantGuard, PermissionsGuard)
export class CatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly audit: CatalogAuditService,
    private readonly importExport: CatalogImportExportService,
  ) {}

  @Get('versions')
  listVersions(@Query('status') status?: string, @Query('page') page?: string) {
    return this.catalog.listVersions(status, Number(page) || 1);
  }

  @Post('versions')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  createVersion(@Body() body: { versionTag?: string; notes?: string }) {
    return this.catalog.createVersion(body);
  }

  @Post('versions/:versionId/publish')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  publishVersion(@Param('versionId') versionId: string) {
    return this.catalog.publishVersion(versionId);
  }

  @Get('tests')
  listTests(
    @Query('status') status?: string,
    @Query('section') section?: string,
    @Query('page') page?: string,
  ) {
    return this.catalog.listTests(status, section, Number(page) || 1);
  }

  @Post('tests')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  createTest(
    @Body()
    body: {
      testCode: string;
      testName: string;
      section?: string;
      specimenTypeId?: string;
      tatMinutes?: number;
      status?: string;
      layoutKey: string;
    },
  ) {
    return this.catalog.createTest(body);
  }

  @Get('tests/:testId')
  getTestById(@Param('testId') testId: string) {
    return this.catalog.getTestById(testId);
  }

  @Patch('tests/:testId')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  updateTest(
    @Param('testId') testId: string,
    @Body()
    body: {
      testName?: string;
      section?: string;
      specimenTypeId?: string;
      tatMinutes?: number;
      status?: string;
      layoutKey?: string;
    },
  ) {
    return this.catalog.updateTest(testId, body);
  }

  @Get('parameters')
  listParameters(
    @Query('status') status?: string,
    @Query('page') page?: string,
  ) {
    return this.catalog.listParameters(status, Number(page) || 1);
  }

  @Post('parameters')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  createParameter(
    @Body()
    body: {
      parameterCode: string;
      parameterName: string;
      resultType: string;
      unitId?: string;
      precision?: number;
      defaultValue?: string;
      enumOptions?: string[];
      formulaSpec?: string;
      status?: string;
    },
  ) {
    return this.catalog.createParameter(body);
  }

  @Get('parameters/:parameterId')
  getParameterById(@Param('parameterId') parameterId: string) {
    return this.catalog.getParameterById(parameterId);
  }

  @Patch('parameters/:parameterId')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  updateParameter(
    @Param('parameterId') parameterId: string,
    @Body()
    body: {
      parameterName?: string;
      resultType?: string;
      unitId?: string;
      precision?: number;
      defaultValue?: string;
      enumOptions?: string[];
      formulaSpec?: string;
      status?: string;
    },
  ) {
    return this.catalog.updateParameter(parameterId, body);
  }

  @Get('tests/:testId/mapping')
  listTestMapping(@Param('testId') testId: string) {
    return this.catalog.listTestMapping(testId);
  }

  @Post('tests/:testId/mapping')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  addTestMapping(
    @Param('testId') testId: string,
    @Body()
    body: {
      parameterId: string;
      displayOrder?: number;
      required?: boolean;
      visibility?: string;
      readOnly?: boolean;
      printFlag?: boolean;
    },
  ) {
    return this.catalog.addTestMapping(testId, body);
  }

  @Post('tests/:testId/mapping/reorder')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  reorderTestMapping(
    @Param('testId') testId: string,
    @Body() body: { parameterIds: string[] },
  ) {
    return this.catalog.reorderTestMapping(testId, body.parameterIds);
  }

  @Patch('tests/:testId/mapping/:mappingId')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  updateTestMapping(
    @Param('testId') testId: string,
    @Param('mappingId') mappingId: string,
    @Body()
    body: {
      displayOrder?: number;
      required?: boolean;
      visibility?: string;
      readOnly?: boolean;
      printFlag?: boolean;
    },
  ) {
    return this.catalog.updateTestMapping(testId, mappingId, body);
  }

  @Delete('tests/:testId/mapping/:mappingId')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  async deleteTestMapping(
    @Param('testId') testId: string,
    @Param('mappingId') mappingId: string,
    @Res() res: Response,
  ) {
    await this.catalog.deleteTestMapping(testId, mappingId);
    res.status(204).send();
  }

  @Get('parameters/:parameterId/reference-ranges')
  listReferenceRanges(@Param('parameterId') parameterId: string) {
    return this.catalog.listReferenceRanges(parameterId);
  }

  @Post('parameters/:parameterId/reference-ranges')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  createReferenceRange(
    @Param('parameterId') parameterId: string,
    @Body()
    body: {
      sex: string;
      ageMinDays?: number;
      ageMaxDays?: number;
      refLow?: number;
      refHigh?: number;
      refText?: string;
      priority?: number;
      effectiveFrom?: string;
      effectiveTo?: string;
      notes?: string;
    },
  ) {
    return this.catalog.createReferenceRange(parameterId, body);
  }

  @Patch('parameters/:parameterId/reference-ranges/:rangeId')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  updateReferenceRange(
    @Param('parameterId') parameterId: string,
    @Param('rangeId') rangeId: string,
    @Body()
    body: {
      sex?: string;
      ageMinDays?: number;
      ageMaxDays?: number;
      refLow?: number;
      refHigh?: number;
      refText?: string;
      priority?: number;
      effectiveFrom?: string;
      effectiveTo?: string;
      notes?: string;
    },
  ) {
    return this.catalog.updateReferenceRange(parameterId, rangeId, body);
  }

  @Delete('parameters/:parameterId/reference-ranges/:rangeId')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  async deleteReferenceRange(
    @Param('parameterId') parameterId: string,
    @Param('rangeId') rangeId: string,
    @Res() res: Response,
  ) {
    await this.catalog.deleteReferenceRange(parameterId, rangeId);
    res.status(204).send();
  }

  @Get('layouts')
  listLayouts() {
    return this.catalog.listLayouts();
  }

  @Post('layouts')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  createLayout(
    @Body()
    body: {
      layoutKey: string;
      groupingStrategy?: string;
      pageBreakPolicy?: string;
      maxTestsPerPage?: number;
      allowedCombineWith?: string[];
      renderStyle?: string;
    },
  ) {
    return this.catalog.createLayout(body);
  }

  @Get('layouts/:layoutId')
  getLayoutById(@Param('layoutId') layoutId: string) {
    return this.catalog.getLayoutById(layoutId);
  }

  @Patch('layouts/:layoutId')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  updateLayout(
    @Param('layoutId') layoutId: string,
    @Body()
    body: {
      groupingStrategy?: string;
      pageBreakPolicy?: string;
      maxTestsPerPage?: number;
      allowedCombineWith?: string[];
      renderStyle?: string;
    },
  ) {
    return this.catalog.updateLayout(layoutId, body);
  }

  @Get('annotations')
  listAnnotations(
    @Query('testId') testId?: string,
    @Query('parameterId') parameterId?: string,
  ) {
    return this.catalog.listAnnotations(testId, parameterId);
  }

  @Post('annotations')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  createAnnotation(
    @Body()
    body: {
      testId?: string;
      parameterId?: string;
      annotationType: string;
      placement: string;
      text: string;
      visibilityRule?: string;
      conditionSpec?: string;
      displayOrder?: number;
    },
  ) {
    return this.catalog.createAnnotation(body);
  }

  @Get('annotations/:annotationId')
  getAnnotationById(@Param('annotationId') annotationId: string) {
    return this.catalog.getAnnotationById(annotationId);
  }

  @Patch('annotations/:annotationId')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  updateAnnotation(
    @Param('annotationId') annotationId: string,
    @Body()
    body: {
      annotationType?: string;
      placement?: string;
      text?: string;
      visibilityRule?: string;
      conditionSpec?: string;
      displayOrder?: number;
    },
  ) {
    return this.catalog.updateAnnotation(annotationId, body);
  }

  @Delete('annotations/:annotationId')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  async deleteAnnotation(
    @Param('annotationId') annotationId: string,
    @Res() res: Response,
  ) {
    await this.catalog.deleteAnnotation(annotationId);
    res.status(204).send();
  }

  @Post('import')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  @UseInterceptors(FileInterceptor('file'))
  importCatalog(
    @UploadedFile()
    file: { buffer?: Buffer; originalname?: string } | undefined,
    @Body() body: { dryRun?: boolean },
  ) {
    const dryRun = body.dryRun !== false;
    return this.importExport.importCatalog(file ?? undefined, dryRun);
  }

  @Post('export')
  exportCatalog(
    @Res() res: Response,
    @Body() body?: { versionId?: string; versionTag?: string },
  ) {
    const buf = this.importExport.exportCatalog(body ?? {});
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=catalog-export.xlsx',
    );
    res.send(buf);
  }

  @Post('audit')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  runAudit(
    @Body() body: { version?: 'published' | 'draft'; section?: string },
  ) {
    return this.audit.createAuditRun(body ?? {});
  }

  @Get('audit')
  listAudits(
    @Query('versionId') versionId?: string,
    @Query('page') page?: string,
  ) {
    return this.audit.listAuditRuns(versionId, Number(page) || 1);
  }

  @Get('audit/:auditId')
  getAuditById(@Param('auditId') auditId: string) {
    return this.audit.getAuditRunById(auditId);
  }
}
