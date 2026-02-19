import { Test, TestingModule } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: PrismaService;

  const tenantId = 'tenant-1';

  beforeEach(async () => {
    const mockPrisma = {
      encounter: { findMany: jest.fn() },
      labOrderItem: { count: jest.fn() },
      document: { count: jest.fn() },
      labTestDefinition: { count: jest.fn() },
      labTestParameter: { count: jest.fn() },
    };
    const mockCls = {
      get: jest.fn().mockReturnValue(tenantId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ClsService, useValue: mockCls },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('returns overview shape with counts, system, catalog, features', async () => {
    (prisma.encounter.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.labOrderItem.count as jest.Mock).mockResolvedValue(2);
    (prisma.document.count as jest.Mock).mockResolvedValue(1);
    (prisma.labTestDefinition.count as jest.Mock).mockResolvedValue(5);
    (prisma.labTestParameter.count as jest.Mock).mockResolvedValue(12);

    const result = await service.getOverview();

    expect(result).toHaveProperty('counts');
    expect(result.counts).toMatchObject({
      verification_queue_count: 2,
      published_last_24h_count: 1,
    });
    expect(result.counts.encounters_by_status).toMatchObject({
      DRAFT: 0,
      ORDERED: 0,
      RESULTS_ENTERED: 0,
      VERIFIED: 0,
      PUBLISHED: 0,
    });
    expect(result).toHaveProperty('system');
    expect(result.system.pdf_service_health).toMatchObject({
      status: expect.stringMatching(/^(ok|degraded)$/),
      last_checked_at: expect.any(String),
    });
    expect(result.catalog).toEqual({ tests_count: 5, parameters_count: 12 });
    expect(result.features).toEqual(
      expect.objectContaining({
        lims: true,
        documents: true,
      }),
    );
  });
});
