"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TenantContextMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantContextMiddleware = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const nestjs_cls_1 = require("nestjs-cls");
let TenantContextMiddleware = TenantContextMiddleware_1 = class TenantContextMiddleware {
    prisma;
    cls;
    logger = new common_1.Logger(TenantContextMiddleware_1.name);
    constructor(prisma, cls) {
        this.prisma = prisma;
        this.cls = cls;
    }
    async use(req, res, next) {
        if (req.path === '/health') {
            next();
            return;
        }
        const hostHeader = typeof req.headers.host === 'string' ? req.headers.host : '';
        const hostValue = (hostHeader || req.hostname || '').trim().toLowerCase();
        const [hostname] = hostValue.split(':');
        let tenantId = null;
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
            const isLocalhost = hostname === 'localhost' ||
                hostname === '127.0.0.1' ||
                hostname.endsWith('.localhost');
            const isDevHeaderEnabled = process.env.TENANCY_DEV_HEADER_ENABLED === '1';
            if (isLocalhost && isDevHeaderEnabled) {
                const headerValue = req.headers['x-tenant-id'];
                const headerTenantId = Array.isArray(headerValue)
                    ? headerValue[0]
                    : headerValue;
                if (typeof headerTenantId === 'string' &&
                    headerTenantId.trim().length > 0) {
                    tenantId = headerTenantId.trim();
                    this.logger.warn(`Using x-tenant-id development fallback for localhost host=${hostname}`);
                }
            }
        }
        if (!tenantId) {
            const headerValue = req.headers['x-tenant-id'];
            const headerTenantId = Array.isArray(headerValue)
                ? headerValue[0]
                : headerValue;
            if (typeof headerTenantId === 'string' &&
                headerTenantId.trim().length > 0) {
                this.logger.warn(`Ignoring x-tenant-id header for non-localhost or disabled fallback host=${hostname}`);
            }
        }
        if (!tenantId) {
            throw new common_1.UnauthorizedException('Tenant context required (hostname not mapped)');
        }
        this.cls.set('TENANT_ID', tenantId);
        req.tenantId = tenantId;
        next();
    }
};
exports.TenantContextMiddleware = TenantContextMiddleware;
exports.TenantContextMiddleware = TenantContextMiddleware = TenantContextMiddleware_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        nestjs_cls_1.ClsService])
], TenantContextMiddleware);
//# sourceMappingURL=tenant-context.middleware.js.map