import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly cls: ClsService) {}

  canActivate(context: ExecutionContext): boolean {
    void context;
    // Tenant is now resolved by middleware and put into CLS.
    // This guard only ensures the middleware ran successfully and context is set.
    const tenantId = this.cls.get<string>('TENANT_ID');

    if (!tenantId) {
      // This case should theoretically be caught by middleware throwing,
      // but as a guard it ensures no leakage if middleware is bypassed/misconfigured.
      throw new UnauthorizedException('Tenant Context Missing');
    }

    return true;
  }
}
