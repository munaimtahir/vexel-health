import {
  Injectable,
  Logger,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if (req.path === '/health') {
      next();
      return;
    }

    const hostHeader =
      typeof req.headers.host === 'string' ? req.headers.host : '';
    const hostValue = (hostHeader || req.hostname || '').trim().toLowerCase();
    const [hostname] = hostValue.split(':');

    let tenantId: string | null = null;

    if (hostname) {
      const tenantDomain = await this.prisma.tenantDomain.findUnique({
        where: { domain: hostname },
        select: { tenantId: true },
      });
      if (tenantDomain) {
        tenantId = tenantDomain.tenantId;
      }
    }

    if (!tenantId) {
      const isLocalhost =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.endsWith('.localhost');
      const isDevHeaderEnabled = process.env.TENANCY_DEV_HEADER_ENABLED === '1';

      if (isLocalhost && isDevHeaderEnabled) {
        const headerValue = req.headers['x-tenant-id'];
        const headerTenantId = Array.isArray(headerValue)
          ? headerValue[0]
          : headerValue;
        if (
          typeof headerTenantId === 'string' &&
          headerTenantId.trim().length > 0
        ) {
          tenantId = headerTenantId.trim();
          this.logger.warn(
            `Using x-tenant-id development fallback for localhost host=${hostname}`,
          );
        }
      }
    }

    if (!tenantId) {
      const headerValue = req.headers['x-tenant-id'];
      const headerTenantId = Array.isArray(headerValue)
        ? headerValue[0]
        : headerValue;
      if (
        typeof headerTenantId === 'string' &&
        headerTenantId.trim().length > 0
      ) {
        this.logger.warn(
          `Ignoring x-tenant-id header for non-localhost or disabled fallback host=${hostname}`,
        );
      }
    }

    if (!tenantId) {
      throw new UnauthorizedException(
        'Tenant context required (hostname not mapped)',
      );
    }

    this.cls.set('TENANT_ID', tenantId);
    (req as { tenantId?: string }).tenantId = tenantId;

    next();
  }
}
