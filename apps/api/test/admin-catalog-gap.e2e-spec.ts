import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ValidationError } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/errors/global-exception.filter';
import { toValidationFieldMap } from '../src/common/errors/validation-errors';
import { PrismaService } from '../src/prisma/prisma.service';

type UserRecord = {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  status: string;
  createdAt: Date;
};

type RoleRecord = {
  id: string;
  tenantId: string;
  name: string;
};

type UserRoleRecord = {
  userId: string;
  roleId: string;
};

type InviteRecord = {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  roleNamesCsv: string;
  status: string;
  expiresAt: Date;
  invitedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type TestRecord = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  department: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type ParameterRecord = {
  id: string;
  tenantId: string;
  testId: string;
  name: string;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  refText: string | null;
  displayOrder: number;
  active: boolean;
};

type PanelRecord = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type PanelTestRecord = {
  id: string;
  tenantId: string;
  panelId: string;
  testId: string;
  sortOrder: number;
  createdAt: Date;
};

type ImportJobRecord = {
  id: string;
  tenantId: string;
  fileName: string;
  mode: string;
  status: string;
  processedRows: number;
  successRows: number;
  failedRows: number;
  errorJson: unknown;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function createPrismaMock() {
  let idCounter = 1;
  const makeId = (prefix: string) => `${prefix}-${idCounter++}`;

  const tenantDomains = new Map<string, string>([
    ['tenant-a.test', 'tenant-a'],
    ['tenant-b.test', 'tenant-b'],
  ]);

  const users: UserRecord[] = [
    {
      id: 'user-a-1',
      tenantId: 'tenant-a',
      email: 'admin-a@tenant.test',
      name: 'Tenant A Admin',
      status: 'active',
      createdAt: new Date('2026-02-18T00:00:00.000Z'),
    },
    {
      id: 'user-b-1',
      tenantId: 'tenant-b',
      email: 'admin-b@tenant.test',
      name: 'Tenant B Admin',
      status: 'active',
      createdAt: new Date('2026-02-18T00:00:00.000Z'),
    },
  ];

  const roles: RoleRecord[] = [
    { id: 'role-a-admin', tenantId: 'tenant-a', name: 'ADMIN' },
    { id: 'role-a-operator', tenantId: 'tenant-a', name: 'OPERATOR' },
    { id: 'role-b-admin', tenantId: 'tenant-b', name: 'ADMIN' },
  ];

  const userRoles: UserRoleRecord[] = [
    { userId: 'user-a-1', roleId: 'role-a-admin' },
    { userId: 'user-b-1', roleId: 'role-b-admin' },
  ];

  const invites: InviteRecord[] = [];

  const tests: TestRecord[] = [
    {
      id: '00000000-0000-4000-8000-000000000101',
      tenantId: 'tenant-a',
      code: 'ALB',
      name: 'Albumin',
      department: 'CHEM',
      active: true,
      createdAt: new Date('2026-02-18T00:00:00.000Z'),
      updatedAt: new Date('2026-02-18T00:00:00.000Z'),
    },
    {
      id: '00000000-0000-4000-8000-000000000201',
      tenantId: 'tenant-b',
      code: 'TSH',
      name: 'TSH',
      department: 'ENDO',
      active: true,
      createdAt: new Date('2026-02-18T00:00:00.000Z'),
      updatedAt: new Date('2026-02-18T00:00:00.000Z'),
    },
  ];

  const parameters: ParameterRecord[] = [
    {
      id: '00000000-0000-4000-8000-000000000301',
      tenantId: 'tenant-a',
      testId: '00000000-0000-4000-8000-000000000101',
      name: 'Albumin',
      unit: 'g/dL',
      refLow: 3.5,
      refHigh: 5.2,
      refText: null,
      displayOrder: 0,
      active: true,
    },
  ];

  const panels: PanelRecord[] = [];
  const panelTests: PanelTestRecord[] = [];
  const importJobs: ImportJobRecord[] = [];
  const auditEvents: Array<Record<string, unknown>> = [];

  const brandingConfigs = new Map<string, Record<string, unknown>>();
  const reportDesignConfigs = new Map<string, Record<string, unknown>>();
  const receiptDesignConfigs = new Map<string, Record<string, unknown>>();

  const prismaMock: any = {
    tenantDomain: {
      findUnique: jest.fn(async ({ where }: { where: { domain: string } }) => {
        const tenantId = tenantDomains.get(where.domain);
        return tenantId ? { tenantId } : null;
      }),
    },
    encounter: {
      findMany: jest.fn(async () => []),
    },
    labOrderItem: {
      count: jest.fn(async () => 0),
    },
    document: {
      count: jest.fn(async () => 0),
    },
    labTestDefinition: {
      count: jest.fn(
        async ({ where }: { where: { tenantId: string } }) =>
          tests.filter((test) => test.tenantId === where.tenantId).length,
      ),
      findFirst: jest.fn(
        async ({ where }: { where: { id: string; tenantId: string } }) =>
          tests.find(
            (test) => test.id === where.id && test.tenantId === where.tenantId,
          ) ?? null,
      ),
      findMany: jest.fn(async ({ where }: { where: { tenantId: string } }) =>
        tests.filter((test) => test.tenantId === where.tenantId),
      ),
    },
    labTestParameter: {
      count: jest.fn(
        async ({ where }: { where: { tenantId: string; active?: boolean } }) =>
          parameters.filter(
            (item) =>
              item.tenantId === where.tenantId &&
              (where.active === undefined || item.active === where.active),
          ).length,
      ),
      findFirst: jest.fn(
        async ({ where }: { where: { id: string; tenantId: string } }) => {
          const parameter =
            parameters.find(
              (item) =>
                item.id === where.id && item.tenantId === where.tenantId,
            ) ?? null;
          if (!parameter) {
            return null;
          }

          const test = tests.find((row) => row.id === parameter.testId);
          return {
            ...parameter,
            test: test
              ? {
                  code: test.code,
                  name: test.name,
                }
              : null,
          };
        },
      ),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const parameter = parameters.find((item) => item.id === where.id);
          if (!parameter) {
            throw new Error('parameter not found');
          }

          parameter.testId =
            (data.testId as string | undefined) ?? parameter.testId;
          parameter.active =
            (data.active as boolean | undefined) ?? parameter.active;
          if (typeof data.displayOrder === 'number') {
            parameter.displayOrder = data.displayOrder;
          }

          const test = tests.find((row) => row.id === parameter.testId);
          return {
            ...parameter,
            test: {
              code: test?.code ?? '',
              name: test?.name ?? '',
            },
          };
        },
      ),
    },
    labReferenceRange: {
      count: jest.fn(async () => 0),
      findMany: jest.fn(async () => []),
      findFirst: jest.fn(async () => null),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: makeId('range'),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      })),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => ({
          id: where.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        }),
      ),
    },
    labPanel: {
      count: jest.fn(
        async ({ where }: { where: { tenantId: string } }) =>
          panels.filter((panel) => panel.tenantId === where.tenantId).length,
      ),
      findMany: jest.fn(async ({ where }: { where: { tenantId: string } }) => {
        const scoped = panels.filter(
          (panel) => panel.tenantId === where.tenantId,
        );
        return scoped.map((panel) => ({
          ...panel,
          tests: panelTests
            .filter(
              (item) =>
                item.tenantId === panel.tenantId && item.panelId === panel.id,
            )
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => {
              const test = tests.find((row) => row.id === item.testId)!;
              return {
                ...item,
                test: {
                  code: test.code,
                  name: test.name,
                },
              };
            }),
        }));
      }),
      findFirst: jest.fn(
        async ({ where }: { where: { id: string; tenantId: string } }) => {
          const panel =
            panels.find(
              (item) =>
                item.id === where.id && item.tenantId === where.tenantId,
            ) ?? null;
          if (!panel) {
            return null;
          }
          return {
            ...panel,
            tests: panelTests
              .filter(
                (item) =>
                  item.tenantId === panel.tenantId && item.panelId === panel.id,
              )
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => {
                const test = tests.find((row) => row.id === item.testId)!;
                return {
                  ...item,
                  test: {
                    code: test.code,
                    name: test.name,
                  },
                };
              }),
          };
        },
      ),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const now = new Date();
        const panel: PanelRecord = {
          id: makeId('panel'),
          tenantId: data.tenantId as string,
          code: data.code as string,
          name: data.name as string,
          description: (data.description as string | null | undefined) ?? null,
          active: (data.active as boolean | undefined) ?? true,
          createdAt: now,
          updatedAt: now,
        };
        panels.push(panel);
        return panel;
      }),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const panel = panels.find((item) => item.id === where.id);
          if (!panel) {
            throw new Error('panel not found');
          }
          if (typeof data.name === 'string') {
            panel.name = data.name;
          }
          if (data.description !== undefined) {
            panel.description = (data.description as string | null) ?? null;
          }
          if (typeof data.active === 'boolean') {
            panel.active = data.active;
          }
          panel.updatedAt = new Date();
          return panel;
        },
      ),
    },
    labPanelTest: {
      findMany: jest.fn(
        async ({ where }: { where: { tenantId: string; panelId: string } }) =>
          panelTests
            .filter(
              (item) =>
                item.tenantId === where.tenantId &&
                item.panelId === where.panelId,
            )
            .sort((a, b) => a.sortOrder - b.sortOrder),
      ),
      deleteMany: jest.fn(
        async ({ where }: { where: { tenantId: string; panelId: string } }) => {
          const toDelete = panelTests.filter(
            (item) =>
              item.tenantId === where.tenantId &&
              item.panelId === where.panelId,
          );
          for (const item of toDelete) {
            const idx = panelTests.indexOf(item);
            if (idx >= 0) {
              panelTests.splice(idx, 1);
            }
          }
          return { count: toDelete.length };
        },
      ),
      createMany: jest.fn(
        async ({ data }: { data: Array<Record<string, unknown>> }) => {
          for (const row of data) {
            panelTests.push({
              id: makeId('panel-test'),
              tenantId: row.tenantId as string,
              panelId: row.panelId as string,
              testId: row.testId as string,
              sortOrder: row.sortOrder as number,
              createdAt: new Date(),
            });
          }
          return { count: data.length };
        },
      ),
    },
    user: {
      count: jest.fn(
        async ({ where }: { where: { tenantId: string } }) =>
          users.filter((user) => user.tenantId === where.tenantId).length,
      ),
      findMany: jest.fn(
        async ({
          where,
          skip = 0,
          take = 20,
        }: {
          where: any;
          skip?: number;
          take?: number;
        }) => {
          const scoped = users.filter(
            (user) => user.tenantId === where.tenantId,
          );
          const query = where.OR?.[0]?.email?.contains as string | undefined;
          const filtered =
            typeof query === 'string' && query.length > 0
              ? scoped.filter(
                  (user) =>
                    user.email.toLowerCase().includes(query.toLowerCase()) ||
                    (user.name ?? '')
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                )
              : scoped;

          return filtered.slice(skip, skip + take).map((user) => ({
            ...user,
            roleMappings: userRoles
              .filter((mapping) => mapping.userId === user.id)
              .map((mapping) => ({
                role: {
                  name:
                    roles.find((role) => role.id === mapping.roleId)?.name ??
                    '',
                },
              })),
          }));
        },
      ),
      findFirst: jest.fn(async ({ where }: { where: any }) => {
        const user = users.find(
          (item) =>
            (where.id ? item.id === where.id : true) &&
            (where.email ? item.email === where.email : true) &&
            item.tenantId === where.tenantId,
        );

        if (!user) {
          return null;
        }

        return {
          ...user,
          roleMappings: userRoles
            .filter((mapping) => mapping.userId === user.id)
            .map((mapping) => ({
              role: {
                name:
                  roles.find((role) => role.id === mapping.roleId)?.name ?? '',
              },
            })),
        };
      }),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { status?: string };
        }) => {
          const user = users.find((item) => item.id === where.id);
          if (!user) {
            throw new Error('user not found');
          }
          if (data.status) {
            user.status = data.status;
          }
          return user;
        },
      ),
      findFirstOrThrow: jest.fn(
        async ({ where }: { where: { id: string; tenantId: string } }) => {
          const user = users.find(
            (item) => item.id === where.id && item.tenantId === where.tenantId,
          );
          if (!user) {
            throw new Error('not found');
          }
          return {
            ...user,
            roleMappings: userRoles
              .filter((mapping) => mapping.userId === user.id)
              .map((mapping) => ({
                role: {
                  name:
                    roles.find((role) => role.id === mapping.roleId)?.name ??
                    '',
                },
              })),
          };
        },
      ),
    },
    role: {
      findMany: jest.fn(
        async ({
          where,
        }: {
          where: { tenantId: string; name: { in: string[] } };
        }) =>
          roles.filter(
            (role) =>
              role.tenantId === where.tenantId &&
              where.name.in.includes(role.name),
          ),
      ),
    },
    userRole: {
      deleteMany: jest.fn(async ({ where }: { where: { userId: string } }) => {
        const toDelete = userRoles.filter(
          (mapping) => mapping.userId === where.userId,
        );
        for (const mapping of toDelete) {
          const idx = userRoles.indexOf(mapping);
          if (idx >= 0) {
            userRoles.splice(idx, 1);
          }
        }
        return { count: toDelete.length };
      }),
      createMany: jest.fn(async ({ data }: { data: UserRoleRecord[] }) => {
        userRoles.push(...data);
        return { count: data.length };
      }),
    },
    adminUserInvite: {
      findFirst: jest.fn(async ({ where }: { where: any }) => {
        const now = new Date();
        return (
          invites.find(
            (invite) =>
              invite.tenantId === where.tenantId &&
              invite.email === where.email &&
              invite.status === where.status &&
              invite.expiresAt > (where.expiresAt?.gt ?? now),
          ) ?? null
        );
      }),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const now = new Date();
        const invite: InviteRecord = {
          id: makeId('invite'),
          tenantId: data.tenantId as string,
          email: data.email as string,
          name: (data.name as string | undefined) ?? null,
          roleNamesCsv: data.roleNamesCsv as string,
          status: data.status as string,
          expiresAt: data.expiresAt as Date,
          invitedByUserId: (data.invitedByUserId as string | undefined) ?? null,
          createdAt: now,
          updatedAt: now,
        };
        invites.push(invite);
        return invite;
      }),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const invite = invites.find((item) => item.id === where.id);
          if (!invite) {
            throw new Error('invite not found');
          }
          invite.name = (data.name as string | undefined) ?? invite.name;
          invite.roleNamesCsv =
            (data.roleNamesCsv as string | undefined) ?? invite.roleNamesCsv;
          invite.expiresAt =
            (data.expiresAt as Date | undefined) ?? invite.expiresAt;
          invite.invitedByUserId =
            (data.invitedByUserId as string | undefined) ??
            invite.invitedByUserId;
          invite.updatedAt = new Date();
          return invite;
        },
      ),
    },
    catalogImportJob: {
      count: jest.fn(
        async ({
          where,
        }: {
          where: { tenantId: string; status?: { in: string[] } };
        }) =>
          importJobs.filter(
            (job) =>
              job.tenantId === where.tenantId &&
              (!where.status || where.status.in.includes(job.status)),
          ).length,
      ),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const now = new Date();
        const job: ImportJobRecord = {
          id: makeId('import'),
          tenantId: data.tenantId as string,
          fileName: data.fileName as string,
          mode: data.mode as string,
          status: data.status as string,
          processedRows: data.processedRows as number,
          successRows: data.successRows as number,
          failedRows: data.failedRows as number,
          errorJson: data.errorJson,
          createdBy: (data.createdBy as string | undefined) ?? null,
          createdAt: now,
          updatedAt: now,
        };
        importJobs.push(job);
        return job;
      }),
      findMany: jest.fn(async ({ where }: { where: { tenantId: string } }) =>
        importJobs
          .filter((job) => job.tenantId === where.tenantId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      ),
      findFirst: jest.fn(
        async ({ where }: { where: { id: string; tenantId: string } }) =>
          importJobs.find(
            (job) => job.id === where.id && job.tenantId === where.tenantId,
          ) ?? null,
      ),
    },
    catalogExportJob: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: makeId('export'),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
      findFirst: jest.fn(async () => null),
    },
    tenantBrandingConfig: {
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const existing = brandingConfigs.get(where.tenantId);
        const now = new Date();
        const next = {
          tenantId: where.tenantId,
          businessName: '',
          address: '',
          phone: '',
          headerLine1: '',
          headerLine2: '',
          logoAssetName: null,
          headerAssetName: null,
          footerAssetName: null,
          updatedBy: null,
          updatedAt: now,
          ...(existing ?? create),
          ...update,
          updatedAt: now,
        };
        brandingConfigs.set(where.tenantId, next);
        return next;
      }),
    },
    tenantReportDesignConfig: {
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const existing = reportDesignConfigs.get(where.tenantId);
        const now = new Date();
        const next = {
          tenantId: where.tenantId,
          showLogo: true,
          logoPosition: 'left',
          headerText1: '',
          headerText2: '',
          headerDividerStyle: 'thin',
          patientLayoutStyle: 'compact',
          showRefNumber: true,
          showConsultant: true,
          showSampleTime: true,
          resultsFontSize: 'normal',
          showUnitsColumn: true,
          showReferenceRange: true,
          abnormalHighlightStyle: 'bold',
          footerText: '',
          showSignatories: true,
          signatoryBlockStyle: 'single',
          updatedBy: null,
          updatedAt: now,
          ...(existing ?? create),
          ...update,
          updatedAt: now,
        };
        reportDesignConfigs.set(where.tenantId, next);
        return next;
      }),
    },
    tenantReceiptDesignConfig: {
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const existing = receiptDesignConfigs.get(where.tenantId);
        const now = new Date();
        const next = {
          tenantId: where.tenantId,
          showLogo: true,
          businessNameOverride: '',
          showAddress: true,
          showContact: true,
          showQuantityColumn: true,
          showUnitPrice: true,
          showDiscountColumn: false,
          showTaxColumn: true,
          showSubtotal: true,
          showDiscount: true,
          showTax: true,
          grandTotalStyle: 'bold',
          thankYouMessage: '',
          termsAndConditions: '',
          showQrCodePlaceholder: false,
          receiptWidthMode: 'a4',
          updatedBy: null,
          updatedAt: now,
          ...(existing ?? create),
          ...update,
          updatedAt: now,
        };
        receiptDesignConfigs.set(where.tenantId, next);
        return next;
      }),
    },
    auditEvent: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        auditEvents.push(data);
        return data;
      }),
    },
    $transaction: jest.fn(async (callback: (tx: any) => Promise<unknown>) =>
      callback(prismaMock),
    ),
  };

  return prismaMock;
}

describe('Admin + catalog gap closure (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(createPrismaMock())
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        exceptionFactory: (errors: ValidationError[]) =>
          new BadRequestException({
            error: {
              type: 'validation_error',
              field_errors: toValidationFieldMap(errors),
            },
          }),
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('runs smoke path: overview -> users -> invite -> panel create -> import create/list', async () => {
    await request(app.getHttpServer())
      .get('/admin/overview')
      .set('Host', 'tenant-a.test')
      .expect(200)
      .expect((response) => {
        expect(response.body.counts).toMatchObject({
          users_count: 1,
          panels_count: 0,
        });
      });

    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Host', 'tenant-a.test')
      .expect(200)
      .expect((response) => {
        expect(response.body.total).toBe(1);
      });

    await request(app.getHttpServer())
      .post('/admin/users/invite')
      .set('Host', 'tenant-a.test')
      .send({
        email: 'new.user@tenant.test',
        name: 'New User',
        roleNames: ['ADMIN'],
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.status).toBe('PENDING');
      });

    const panelRes = await request(app.getHttpServer())
      .post('/lab/panels')
      .set('Host', 'tenant-a.test')
      .set('Authorization', 'Bearer mock.tenant-a.user-a-1.LAB_CATALOG_WRITE')
      .send({
        code: 'BASIC-PANEL',
        name: 'Basic Panel',
      })
      .expect(201);

    expect(panelRes.body.code).toBe('BASIC-PANEL');

    await request(app.getHttpServer())
      .post('/lab/catalog-imports')
      .set('Host', 'tenant-a.test')
      .set('Authorization', 'Bearer mock.tenant-a.user-a-1.LAB_CATALOG_WRITE')
      .field('mode', 'MERGE')
      .attach('file', Buffer.from([0x50, 0x4b, 0x03, 0x04]), 'catalog.xlsx')
      .expect(201)
      .expect((response) => {
        expect(response.body.status).toBe('COMPLETED');
      });

    await request(app.getHttpServer())
      .get('/lab/catalog-imports')
      .set('Host', 'tenant-a.test')
      .expect(200)
      .expect((response) => {
        expect(response.body.total).toBeGreaterThan(0);
      });
  });

  it('enforces tenant-scoped users and panels', async () => {
    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Host', 'tenant-b.test')
      .expect(200)
      .expect((response) => {
        expect(response.body.total).toBe(1);
        expect(response.body.data[0].email).toBe('admin-b@tenant.test');
      });

    await request(app.getHttpServer())
      .get('/lab/panels')
      .set('Host', 'tenant-b.test')
      .expect(200)
      .expect((response) => {
        expect(response.body.total).toBe(0);
      });
  });

  it('returns row-level structured domain error for invalid import payload', async () => {
    await request(app.getHttpServer())
      .post('/lab/catalog-imports')
      .set('Host', 'tenant-a.test')
      .set('Authorization', 'Bearer mock.tenant-a.user-a-1.LAB_CATALOG_WRITE')
      .attach('file', Buffer.from('not-a-zip'), 'bad.txt')
      .expect(409)
      .expect((response) => {
        expect(response.body.error.type).toBe('domain_error');
        expect(response.body.error.code).toBe(
          'CATALOG_IMPORT_VALIDATION_FAILED',
        );
        expect(response.body.error.details.row_errors).toHaveLength(1);
      });
  });

  it('loads and updates business branding config', async () => {
    await request(app.getHttpServer())
      .get('/admin/business/branding')
      .set('Host', 'tenant-a.test')
      .expect(200)
      .expect((response) => {
        expect(response.body.businessName).toBe('');
      });

    await request(app.getHttpServer())
      .put('/admin/business/branding')
      .set('Host', 'tenant-a.test')
      .send({
        businessName: 'Tenant A Labs',
        address: 'Addr',
        phone: '123',
        headerLine1: 'H1',
        headerLine2: 'H2',
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.businessName).toBe('Tenant A Labs');
      });
  });

  it('keeps linking command idempotent for same test/parameter pair', async () => {
    const first = await request(app.getHttpServer())
      .post('/lab/linking:link-test-parameter')
      .set('Host', 'tenant-a.test')
      .set('Authorization', 'Bearer mock.tenant-a.user-a-1.LAB_CATALOG_WRITE')
      .send({
        testId: '00000000-0000-4000-8000-000000000101',
        parameterId: '00000000-0000-4000-8000-000000000301',
        displayOrder: 0,
      })
      .expect(200);

    const second = await request(app.getHttpServer())
      .post('/lab/linking:link-test-parameter')
      .set('Host', 'tenant-a.test')
      .set('Authorization', 'Bearer mock.tenant-a.user-a-1.LAB_CATALOG_WRITE')
      .send({
        testId: '00000000-0000-4000-8000-000000000101',
        parameterId: '00000000-0000-4000-8000-000000000301',
        displayOrder: 0,
      })
      .expect(200);

    expect(first.body.id).toBe('00000000-0000-4000-8000-000000000301');
    expect(second.body.id).toBe('00000000-0000-4000-8000-000000000301');
    expect(second.body.testId).toBe('00000000-0000-4000-8000-000000000101');
    expect(second.body.active).toBe(true);
  });
});
