import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../common/guards/tenant.guard';
import { BusinessConfigService } from './business-config.service';
import { UpdateBrandingConfigDto } from './dto/update-branding-config.dto';
import { UpdateReceiptDesignConfigDto } from './dto/update-receipt-design-config.dto';
import { UpdateReportDesignConfigDto } from './dto/update-report-design-config.dto';

@Controller('admin/business')
@UseGuards(TenantGuard)
export class BusinessConfigController {
  constructor(private readonly service: BusinessConfigService) {}

  @Get('branding')
  getBranding() {
    return this.service.getBranding();
  }

  @Put('branding')
  updateBranding(@Body() dto: UpdateBrandingConfigDto) {
    return this.service.updateBranding(dto);
  }

  @Get('report-design')
  getReportDesign() {
    return this.service.getReportDesign();
  }

  @Put('report-design')
  updateReportDesign(@Body() dto: UpdateReportDesignConfigDto) {
    return this.service.updateReportDesign(dto);
  }

  @Get('receipt-design')
  getReceiptDesign() {
    return this.service.getReceiptDesign();
  }

  @Put('receipt-design')
  updateReceiptDesign(@Body() dto: UpdateReceiptDesignConfigDto) {
    return this.service.updateReceiptDesign(dto);
  }
}
