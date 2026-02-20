import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { type Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { PERMISSIONS } from '../auth/permissions.constants';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CreateCatalogExportDto } from './dto/create-catalog-export.dto';
import { CreatePanelDto } from './dto/create-panel.dto';
import { LinkTestParameterDto } from './dto/link-test-parameter.dto';
import { PanelAddTestDto } from './dto/panel-add-test.dto';
import { PanelRemoveTestDto } from './dto/panel-remove-test.dto';
import { UnlinkTestParameterDto } from './dto/unlink-test-parameter.dto';
import { UpdatePanelDto } from './dto/update-panel.dto';
import { UpsertReferenceRangeDto } from './dto/upsert-reference-range.dto';
import { LabAdminCatalogService } from './lab-admin-catalog.service';

type UploadedCatalogFile = {
  originalname: string;
  buffer: Buffer;
};

@Controller('lab')
@UseGuards(TenantGuard, PermissionsGuard)
export class LabAdminCatalogController {
  constructor(private readonly service: LabAdminCatalogService) {}

  @Get('panels')
  listPanels() {
    return this.service.listPanels();
  }

  @Post('panels')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  createPanel(@Body() dto: CreatePanelDto) {
    return this.service.createPanel(dto);
  }

  @Get('panels/:panelId')
  getPanelById(@Param('panelId') panelId: string) {
    return this.service.getPanelById(panelId);
  }

  @Patch('panels/:panelId')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  updatePanel(@Param('panelId') panelId: string, @Body() dto: UpdatePanelDto) {
    return this.service.updatePanel(panelId, dto);
  }

  @Post('panels/:panelId\\:add-test')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  addTestToPanel(
    @Param('panelId') panelId: string,
    @Body() dto: PanelAddTestDto,
  ) {
    return this.service.addTestToPanel(panelId, dto);
  }

  @Post('panels/:panelId\\:remove-test')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  removeTestFromPanel(
    @Param('panelId') panelId: string,
    @Body() dto: PanelRemoveTestDto,
  ) {
    return this.service.removeTestFromPanel(panelId, dto);
  }

  @Get('parameters/:parameterId')
  getParameterById(@Param('parameterId') parameterId: string) {
    return this.service.getParameterById(parameterId);
  }

  @Get('linking/state')
  getLinkingState() {
    return this.service.getLinkingState();
  }

  @Post('linking\\:link-test-parameter')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  linkTestParameter(@Body() dto: LinkTestParameterDto) {
    return this.service.linkTestParameter(dto);
  }

  @Post('linking\\:unlink-test-parameter')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  unlinkTestParameter(@Body() dto: UnlinkTestParameterDto) {
    return this.service.unlinkTestParameter(dto);
  }

  @Get('tests/:testId/reference-ranges')
  listReferenceRanges(@Param('testId') testId: string) {
    return this.service.listReferenceRanges(testId);
  }

  @Post('tests/:testId\\:upsert-reference-range')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  upsertReferenceRange(
    @Param('testId') testId: string,
    @Body() dto: UpsertReferenceRangeDto,
  ) {
    return this.service.upsertReferenceRange(testId, dto);
  }

  @Post('catalog-imports')
  @UseInterceptors(FileInterceptor('file'))
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  createCatalogImportJob(
    @UploadedFile() file: UploadedCatalogFile | undefined,
    @Body('mode') mode?: string,
  ) {
    return this.service.createCatalogImportJob(file, mode);
  }

  @Get('catalog-imports')
  listCatalogImportJobs() {
    return this.service.listCatalogImportJobs();
  }

  @Get('catalog-imports/:jobId')
  getCatalogImportJob(@Param('jobId') jobId: string) {
    return this.service.getCatalogImportJob(jobId);
  }

  @Post('catalog-exports')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  createCatalogExportJob(@Body() dto: CreateCatalogExportDto) {
    return this.service.createCatalogExportJob(dto);
  }

  @Get('catalog-exports')
  listCatalogExportJobs() {
    return this.service.listCatalogExportJobs();
  }

  @Get('catalog-exports/:jobId/file')
  async getCatalogExportFile(
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ) {
    const file = await this.service.getCatalogExportFile(jobId);
    res.setHeader(
      'content-type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'content-disposition',
      `attachment; filename="${file.fileName}"`,
    );
    res.send(file.bytes);
  }
}
