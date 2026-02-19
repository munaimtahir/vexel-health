import { Test, TestingModule } from '@nestjs/testing';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { PrismaService } from '../prisma/prisma.service';
import { ClsService } from 'nestjs-cls';
import { UnauthorizedException } from '@nestjs/common';

describe('TenantContextMiddleware', () => {
  let middleware: TenantContextMiddleware;
  let prisma: PrismaService;
  let cls: ClsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantContextMiddleware,
        {
          provide: PrismaService,
          useValue: {
            tenantDomain: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: ClsService,
          useValue: {
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    middleware = module.get<TenantContextMiddleware>(TenantContextMiddleware);
    prisma = module.get<PrismaService>(PrismaService);
    cls = module.get<ClsService>(ClsService);
  });

  const mockNext = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
    process.env.TENANCY_DEV_HEADER_ENABLED = '0'; // Default safe
  });

  it('should resolve tenant from hostname (production path)', async () => {
    const req: any = { headers: { host: 'customer.com' } };
    const res: any = { setHeader: jest.fn() };

    (prisma.tenantDomain.findUnique as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-123',
    });

    await middleware.use(req, res, mockNext);

    expect(prisma.tenantDomain.findUnique).toHaveBeenCalledWith({
      where: { domain: 'customer.com' },
      select: { tenantId: true },
    });
    expect(cls.set).toHaveBeenCalledWith('TENANT_ID', 'tenant-123');
    expect(req.tenantId).toBe('tenant-123'); // Debug check
    expect(mockNext).toHaveBeenCalled();
  });

  it('should throw if hostname not found and dev mode disabled', async () => {
    const req: any = { headers: { host: 'unknown.com' } };
    const res: any = { setHeader: jest.fn() };
    (prisma.tenantDomain.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(middleware.use(req, res, mockNext)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(cls.set).not.toHaveBeenCalledWith('TENANT_ID', expect.any(String));
  });

  it('should use header if localhost + env enabled (dev path)', async () => {
    process.env.TENANCY_DEV_HEADER_ENABLED = '1';
    const req: any = {
      headers: { host: 'localhost:3000', 'x-tenant-id': 'dev-tenant-id' },
    };
    const res: any = { setHeader: jest.fn() };

    // DB returns null for localhost
    (prisma.tenantDomain.findUnique as jest.Mock).mockResolvedValue(null);

    await middleware.use(req, res, mockNext);

    expect(prisma.tenantDomain.findUnique).toHaveBeenCalled(); // Tried to look up localhost
    expect(cls.set).toHaveBeenCalledWith('TENANT_ID', 'dev-tenant-id');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should NOT use header if env disabled even on localhost', async () => {
    process.env.TENANCY_DEV_HEADER_ENABLED = '0';
    const req: any = {
      headers: { host: 'localhost:3000', 'x-tenant-id': 'dev-tenant-id' },
    };
    const res: any = { setHeader: jest.fn() };
    (prisma.tenantDomain.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(middleware.use(req, res, mockNext)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
