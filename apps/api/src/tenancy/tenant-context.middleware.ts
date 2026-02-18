import { Injectable, NestMiddleware, UnauthorizedException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
    private readonly logger = new Logger(TenantContextMiddleware.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly cls: ClsService,
    ) { }

    async use(req: Request, res: Response, next: NextFunction) {
        // 1. Resolve Hostname
        // req.hostname usually excludes port. req.headers.host includes port.
        // We want the domain/ip without port.
        const hostHeader = req.headers.host || '';
        const [hostname] = hostHeader.split(':');

        let tenantId: string | null = null;

        // 2. Lookup TenantDomain
        if (hostname) {
            const tenantDomain = await this.prisma.tenantDomain.findUnique({
                where: { domain: hostname },
                select: { tenantId: true },
            });
            if (tenantDomain) {
                tenantId = tenantDomain.tenantId;
            }
        }

        // 3. Dev Fallback
        if (!tenantId) {
            const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
            const isDevHeaderEnabled = process.env.TENANCY_DEV_HEADER === '1';

            if (isLocalhost && isDevHeaderEnabled) {
                const headerValue = req.headers['x-tenant-id'];
                if (typeof headerValue === 'string' && headerValue) {
                    tenantId = headerValue;
                    this.logger.warn(`Using Dev-Only Header Tenant ID: ${tenantId}`);
                }
            }
        }

        // 4. Enforce Tenancy
        if (!tenantId) {
            throw new UnauthorizedException('Tenant context required (hostname not mapped)');
        }

        // 5. Set Context
        this.cls.set('TENANT_ID', tenantId);
        // Attach to request for debugging/logging, but types might complain so we use 'any' or just standard assignment if extended
        (req as any).tenantId = tenantId;

        next();
    }
}
