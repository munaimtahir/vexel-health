import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '../auth/permissions.constants';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { AddParameterDto } from './dto/add-parameter.dto';
import { CreateTestDto } from './dto/create-test.dto';
import { LabCatalogService } from './lab-catalog.service';

@Controller('lab/tests')
@UseGuards(TenantGuard, PermissionsGuard)
export class LabCatalogController {
  constructor(private readonly service: LabCatalogService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  createTest(@Body() dto: CreateTestDto) {
    return this.service.createTest(dto);
  }

  @Get()
  listTests() {
    return this.service.listTests();
  }

  @Get(':testId')
  getTestById(@Param('testId') testId: string) {
    return this.service.getTestById(testId);
  }

  @Post(':testId/parameters')
  @RequirePermissions(PERMISSIONS.LAB_CATALOG_WRITE)
  addParameter(@Param('testId') testId: string, @Body() dto: AddParameterDto) {
    return this.service.addParameter(testId, dto);
  }

  @Get(':testId/parameters')
  listParameters(@Param('testId') testId: string) {
    return this.service.listParameters(testId);
  }
}
