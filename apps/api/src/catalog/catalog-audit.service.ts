import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditFinding {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  details?: Record<string, unknown>;
}

export interface CatalogAuditResult {
  passed: boolean;
  summary: {
    totalTests: number;
    totalParameters: number;
    findingsCount: number;
  };
  findings: AuditFinding[];
}

@Injectable()
export class CatalogAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get tenantId(): string {
    const tenantId = this.cls.get<string>('TENANT_ID');
    if (!tenantId) throw new UnauthorizedException('Tenant context missing');
    return tenantId;
  }

  private get userId(): string | null {
    return this.cls.get<string | null>('USER_ID') ?? null;
  }

  async runAudit(options: {
    version?: 'published' | 'draft';
    section?: string;
  }): Promise<CatalogAuditResult> {
    const tenantId = this.tenantId;
    const findings: AuditFinding[] = [];

    const tests = await this.prisma.testDefinition.findMany({
      where: {
        tenantId,
        ...(options.section && { section: options.section }),
        ...(options.version === 'published' && { status: 'active' }),
      },
      include: {
        parameterMaps: {
          include: { parameter: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    const parameterIds = new Set<string>();
    tests.forEach((t) =>
      t.parameterMaps.forEach((m) => parameterIds.add(m.parameterId)),
    );
    const parameters = await this.prisma.parameterDefinition.findMany({
      where: { id: { in: [...parameterIds] }, tenantId },
    });
    const paramMap = new Map(parameters.map((p) => [p.id, p]));

    for (const test of tests) {
      if (test.parameterMaps.length === 0) {
        findings.push({
          code: 'TEST_NO_PARAMETERS',
          message: `Test "${test.testName}" (${test.testCode}) has no mapped parameters`,
          severity: 'error',
          details: { testId: test.id, testCode: test.testCode },
        });
      }
      const displayOrders = test.parameterMaps.map((m) => m.displayOrder);
      const uniqueOrders = new Set(displayOrders);
      if (uniqueOrders.size !== displayOrders.length) {
        findings.push({
          code: 'DUPLICATE_DISPLAY_ORDER',
          message: `Test "${test.testName}" has duplicate display_order values`,
          severity: 'warning',
          details: { testId: test.id },
        });
      }
      for (const map of test.parameterMaps) {
        const param = paramMap.get(map.parameterId);
        if (param?.resultType === 'formula' && param.formulaSpec) {
          if (!param.formulaSpec.trim()) {
            findings.push({
              code: 'FORMULA_EMPTY',
              message: `Parameter "${param.parameterName}" (formula) has empty formula_spec`,
              severity: 'error',
              details: { parameterId: param.id },
            });
          }
        }
      }
    }

    const layoutKeys = new Set(
      (
        await this.prisma.reportLayoutRule.findMany({
          where: { tenantId },
          select: { layoutKey: true },
        })
      ).map((r) => r.layoutKey),
    );
    for (const test of tests) {
      if (test.layoutKey && !layoutKeys.has(test.layoutKey)) {
        findings.push({
          code: 'LAYOUT_KEY_MISSING',
          message: `Test "${test.testName}" references non-existent layout_key "${test.layoutKey}"`,
          severity: 'error',
          details: { testId: test.id, layoutKey: test.layoutKey },
        });
      }
    }

    const passed = !findings.some((f) => f.severity === 'error');
    const summary = {
      totalTests: tests.length,
      totalParameters: parameters.length,
      findingsCount: findings.length,
    };

    return { passed, summary, findings };
  }

  async createAuditRun(options: {
    version?: 'published' | 'draft';
    section?: string;
  }) {
    const result = await this.runAudit(options);
    const tenantId = this.tenantId;
    const run = await this.prisma.catalogAuditRun.create({
      data: {
        tenantId,
        createdBy: this.userId,
        summaryJson: result.summary as object,
        findingsJson: result.findings as unknown as object,
        sha256: null,
      },
    });
    return {
      id: run.id,
      tenantId: run.tenantId,
      catalogVersionId: run.catalogVersionId,
      createdBy: run.createdBy,
      createdAt: run.createdAt.toISOString(),
      summaryJson: run.summaryJson,
      findingsJson: run.findingsJson,
      sha256: run.sha256,
    };
  }

  async getAuditRunById(auditId: string) {
    const tenantId = this.tenantId;
    const run = await this.prisma.catalogAuditRun.findFirst({
      where: { id: auditId, tenantId },
    });
    if (!run) throw new NotFoundException('Audit run not found');
    return {
      id: run.id,
      tenantId: run.tenantId,
      catalogVersionId: run.catalogVersionId,
      createdBy: run.createdBy,
      createdAt: run.createdAt.toISOString(),
      summaryJson: run.summaryJson,
      findingsJson: run.findingsJson,
      sha256: run.sha256,
    };
  }

  async listAuditRuns(versionId?: string, page = 1) {
    const where = {
      tenantId: this.tenantId,
      ...(versionId && { catalogVersionId: versionId }),
    };
    const [data, total] = await Promise.all([
      this.prisma.catalogAuditRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * 20,
        take: 20,
      }),
      this.prisma.catalogAuditRun.count({ where }),
    ]);
    return {
      data: data.map((r) => ({
        id: r.id,
        tenantId: r.tenantId,
        catalogVersionId: r.catalogVersionId,
        createdBy: r.createdBy,
        createdAt: r.createdAt.toISOString(),
        summaryJson: r.summaryJson,
        findingsJson: r.findingsJson,
        sha256: r.sha256,
      })),
      total,
    };
  }
}
