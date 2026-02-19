import { Controller, Get, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../common/guards/tenant.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(TenantGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }
}
