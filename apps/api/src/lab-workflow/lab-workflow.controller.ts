import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '../auth/permissions.constants';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { AddTestToEncounterDto } from './dto/add-test-to-encounter.dto';
import { EnterLabResultsDto } from './dto/enter-lab-results.dto';
import { VerifyLabResultsDto } from './dto/verify-lab-results.dto';
import { LabWorkflowService } from './lab-workflow.service';

@Controller('encounters')
@UseGuards(TenantGuard, PermissionsGuard)
export class LabWorkflowController {
  constructor(private readonly service: LabWorkflowService) {}

  @Post(':id\\:lab-add-test')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.LAB_ORDER_WRITE)
  addTestToEncounter(
    @Param('id') encounterId: string,
    @Body() dto: AddTestToEncounterDto,
  ) {
    return this.service.addTestToEncounter(encounterId, dto);
  }

  @Get(':id/lab-tests')
  listEncounterLabTests(@Param('id') encounterId: string) {
    return this.service.listEncounterLabTests(encounterId);
  }

  @Post(':id\\:lab-enter-results')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.LAB_RESULTS_WRITE)
  enterResults(
    @Param('id') encounterId: string,
    @Body() dto: EnterLabResultsDto,
  ) {
    return this.service.enterResults(encounterId, dto);
  }

  @Post(':id\\:lab-verify')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.LAB_RESULTS_VERIFY)
  verifyResults(
    @Param('id') encounterId: string,
    @Body() dto: VerifyLabResultsDto,
  ) {
    return this.service.verifyResults(encounterId, dto);
  }

  @Post(':id\\:lab-publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.LAB_REPORT_PUBLISH)
  publishLabReport(@Param('id') encounterId: string) {
    return this.service.publishLabReport(encounterId);
  }
}
