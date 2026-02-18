import { Controller, Get, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('me')
@UseGuards(TenantGuard)
export class MeController {
  @Get()
  getMe() {
    // In real app, extract from CLS or User object attached by AuthGuard
    return { id: 'user-1', name: 'Test User', email: 'test@example.com' };
  }

  @Get('features')
  getFeatures() {
    return {
      lims: true,
      billing: false,
      documents: true,
    };
  }
}
