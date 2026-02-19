import {
  Injectable,
  Logger,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'node:crypto';
import { writeWorkflowTrace } from '../common/observability/workflow-trace';

type TraceRequest = Request & { tenantId?: string; requestId?: string };

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const traceReq = req as TraceRequest;
    const requestId = this.getRequestId(req);
    this.cls.set('REQUEST_ID', requestId);
    traceReq.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    res.setHeader('x-correlation-id', requestId);
    (req.headers as Record<string, string | string[]>)['x-correlation-id'] =
      requestId;

    if (req.path === '/health') {
      writeWorkflowTrace({
        event: 'http.request.received',
        requestId,
        tenantId: null,
        userId: null,
        endpoint: `${req.method} ${req.originalUrl ?? req.url}`,
        method: req.method,
        path: req.originalUrl ?? req.url,
      });
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
      writeWorkflowTrace({
        event: 'http.request.received',
        requestId,
        tenantId: null,
        userId: null,
        endpoint: `${req.method} ${req.originalUrl ?? req.url}`,
        method: req.method,
        path: req.originalUrl ?? req.url,
        host: hostname,
        tenantResolved: false,
      });
      throw new UnauthorizedException(
        'Tenant context required (hostname not mapped)',
      );
    }

    this.cls.set('TENANT_ID', tenantId);
    traceReq.tenantId = tenantId;

    writeWorkflowTrace({
      event: 'http.request.received',
      requestId,
      tenantId,
      userId: null,
      endpoint: `${req.method} ${req.originalUrl ?? req.url}`,
      method: req.method,
      path: req.originalUrl ?? req.url,
      host: hostname,
      tenantResolved: true,
    });

    next();
  }

  private getRequestId(req: Request): string {
    const xRequestId = req.headers['x-request-id'];
    if (typeof xRequestId === 'string' && xRequestId.trim().length > 0) {
      return xRequestId.trim();
    }

    if (Array.isArray(xRequestId) && xRequestId[0]?.trim()) {
      return xRequestId[0].trim();
    }

    const xCorrelationId = req.headers['x-correlation-id'];
    if (
      typeof xCorrelationId === 'string' &&
      xCorrelationId.trim().length > 0
    ) {
      return xCorrelationId.trim();
    }

    if (Array.isArray(xCorrelationId) && xCorrelationId[0]?.trim()) {
      return xCorrelationId[0].trim();
    }

    return randomUUID();
  }
}
