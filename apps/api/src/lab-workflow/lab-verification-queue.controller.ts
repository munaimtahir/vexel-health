import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '../auth/permissions.constants';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { LabWorkflowService } from './lab-workflow.service';

@Controller('lab')
@UseGuards(TenantGuard, PermissionsGuard)
export class LabVerificationQueueController {
  constructor(private readonly service: LabWorkflowService) {}

  @Get('verification-queue')
  @RequirePermissions(PERMISSIONS.LAB_RESULTS_VERIFY)
  getVerificationQueue(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.service.getVerificationQueue({
      limit: limitNum,
      cursor,
    });
  }
}
