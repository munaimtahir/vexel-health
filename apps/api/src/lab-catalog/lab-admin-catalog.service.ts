import { Prisma } from '@prisma/client';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DomainException } from '../common/errors/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCatalogExportDto } from './dto/create-catalog-export.dto';
import { CreatePanelDto } from './dto/create-panel.dto';
import { LinkTestParameterDto } from './dto/link-test-parameter.dto';
import { PanelAddTestDto } from './dto/panel-add-test.dto';
import { PanelRemoveTestDto } from './dto/panel-remove-test.dto';
import { UnlinkTestParameterDto } from './dto/unlink-test-parameter.dto';
import { UpdatePanelDto } from './dto/update-panel.dto';
import { UpsertReferenceRangeDto } from './dto/upsert-reference-range.dto';

type UploadedCatalogFile = {
  originalname: string;
  buffer: Buffer;
};

@Injectable()
export class LabAdminCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get tenantId(): string {
    const tenantId = this.cls.get<string>('TENANT_ID');
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context missing');
    }
    return tenantId;
  }

  private get actorIdentity(): string | null {
    return (
      this.cls.get<string>('USER_EMAIL') ??
      this.cls.get<string>('USER_ID') ??
      this.cls.get<string>('USER_SUB') ??
      null
    );
  }

  async listPanels() {
    const tenantId = this.tenantId;

    const [panels, total] = await Promise.all([
      this.prisma.labPanel.findMany({
        where: { tenantId },
        include: {
          tests: {
            include: {
              test: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
        },
        orderBy: [{ name: 'asc' }, { code: 'asc' }],
      }),
      this.prisma.labPanel.count({ where: { tenantId } }),
    ]);

    return {
      data: panels.map((panel) => this.mapPanel(panel)),
      total,
    };
  }

  async createPanel(dto: CreatePanelDto) {
    const tenantId = this.tenantId;

    try {
      const panel = await this.prisma.labPanel.create({
        data: {
          tenantId,
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          active: dto.active ?? true,
        },
      });

      await this.writeAuditEvent({
        eventType: 'catalog.panel.created',
        entityType: 'lab_panel',
        entityId: panel.id,
        payload: {
          panel_code: panel.code,
          panel_name: panel.name,
        },
      });

      return this.getPanelById(panel.id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new DomainException(
          'LAB_PANEL_CODE_CONFLICT',
          'A panel with this code already exists',
        );
      }

      throw error;
    }
  }

  async getPanelById(panelId: string) {
    const panel = await this.loadPanel(this.prisma, panelId);
    if (!panel) {
      throw new NotFoundException('Panel not found');
    }

    return this.mapPanel(panel);
  }

  async updatePanel(panelId: string, dto: UpdatePanelDto) {
    if (
      dto.name === undefined &&
      dto.description === undefined &&
      dto.active === undefined
    ) {
      throw new DomainException(
        'NO_UPDATABLE_FIELDS',
        'At least one updatable field is required',
      );
    }

    const panel = await this.prisma.labPanel.findFirst({
      where: {
        id: panelId,
        tenantId: this.tenantId,
      },
      select: {
        id: true,
      },
    });

    if (!panel) {
      throw new NotFoundException('Panel not found');
    }

    await this.prisma.labPanel.update({
      where: { id: panel.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });

    await this.writeAuditEvent({
      eventType: 'catalog.panel.updated',
      entityType: 'lab_panel',
      entityId: panel.id,
      payload: {
        changed_fields: Object.keys(dto),
      },
    });

    return this.getPanelById(panel.id);
  }

  async addTestToPanel(panelId: string, dto: PanelAddTestDto) {
    const tenantId = this.tenantId;

    const result = await this.prisma.$transaction(async (tx) => {
      const panel = await tx.labPanel.findFirst({
        where: {
          id: panelId,
          tenantId,
        },
      });

      if (!panel) {
        throw new NotFoundException('Panel not found');
      }

      const test = await tx.labTestDefinition.findFirst({
        where: {
          id: dto.testId,
          tenantId,
          active: true,
        },
      });

      if (!test) {
        throw new NotFoundException('LAB test not found');
      }

      const existingLinks = await tx.labPanelTest.findMany({
        where: {
          tenantId,
          panelId: panel.id,
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });

      const orderedTestIds = existingLinks.map((item) => item.testId);
      const existingIndex = orderedTestIds.findIndex((id) => id === dto.testId);

      const targetIndex = this.clampIndex(dto.sortOrder, orderedTestIds.length);

      if (existingIndex >= 0) {
        if (targetIndex === undefined || existingIndex === targetIndex) {
          return this.requirePanel(tx, panel.id);
        }

        orderedTestIds.splice(existingIndex, 1);
        orderedTestIds.splice(targetIndex, 0, dto.testId);
      } else if (targetIndex === undefined) {
        orderedTestIds.push(dto.testId);
      } else {
        orderedTestIds.splice(targetIndex, 0, dto.testId);
      }

      await this.rewritePanelTests(tx, panel.id, orderedTestIds);
      return this.requirePanel(tx, panel.id);
    });

    await this.writeAuditEvent({
      eventType: 'catalog.panel.test_added',
      entityType: 'lab_panel',
      entityId: panelId,
      payload: {
        test_id: dto.testId,
        requested_sort_order: dto.sortOrder ?? null,
      },
    });

    return this.mapPanel(result);
  }

  async removeTestFromPanel(panelId: string, dto: PanelRemoveTestDto) {
    const tenantId = this.tenantId;

    const result = await this.prisma.$transaction(async (tx) => {
      const panel = await tx.labPanel.findFirst({
        where: {
          id: panelId,
          tenantId,
        },
      });

      if (!panel) {
        throw new NotFoundException('Panel not found');
      }

      const existingLinks = await tx.labPanelTest.findMany({
        where: {
          tenantId,
          panelId: panel.id,
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });

      const orderedTestIds = existingLinks
        .map((item) => item.testId)
        .filter((testId) => testId !== dto.testId);

      if (orderedTestIds.length !== existingLinks.length) {
        await this.rewritePanelTests(tx, panel.id, orderedTestIds);
      }

      return this.requirePanel(tx, panel.id);
    });

    await this.writeAuditEvent({
      eventType: 'catalog.panel.test_removed',
      entityType: 'lab_panel',
      entityId: panelId,
      payload: {
        test_id: dto.testId,
      },
    });

    return this.mapPanel(result);
  }

  async getParameterById(parameterId: string) {
    const parameter = await this.prisma.labTestParameter.findFirst({
      where: {
        id: parameterId,
        tenantId: this.tenantId,
      },
      include: {
        test: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });

    if (!parameter) {
      throw new NotFoundException('LAB parameter not found');
    }

    return this.mapParameterDetail(parameter);
  }

  async getLinkingState() {
    const tenantId = this.tenantId;
    const [testsCount, parametersCount, linkedParametersCount, rangesCount] =
      await Promise.all([
        this.prisma.labTestDefinition.count({ where: { tenantId } }),
        this.prisma.labTestParameter.count({ where: { tenantId } }),
        this.prisma.labTestParameter.count({
          where: {
            tenantId,
            active: true,
          },
        }),
        this.prisma.labReferenceRange.count({ where: { tenantId } }),
      ]);

    return {
      tests_count: testsCount,
      parameters_count: parametersCount,
      linked_parameters_count: linkedParametersCount,
      ranges_count: rangesCount,
    };
  }

  async linkTestParameter(dto: LinkTestParameterDto) {
    const tenantId = this.tenantId;

    const linked = await this.prisma.$transaction(async (tx) => {
      const test = await tx.labTestDefinition.findFirst({
        where: {
          id: dto.testId,
          tenantId,
        },
      });
      if (!test) {
        throw new NotFoundException('LAB test not found');
      }

      const parameter = await tx.labTestParameter.findFirst({
        where: {
          id: dto.parameterId,
          tenantId,
        },
      });

      if (!parameter) {
        throw new NotFoundException('LAB parameter not found');
      }

      try {
        const updated = await tx.labTestParameter.update({
          where: {
            id: parameter.id,
          },
          data: {
            testId: test.id,
            active: true,
            ...(dto.displayOrder !== undefined
              ? { displayOrder: dto.displayOrder }
              : {}),
          },
          include: {
            test: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        });

        return updated;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new DomainException(
            'LAB_PARAMETER_CONFLICT',
            'A parameter with this name already exists for the target test',
          );
        }
        throw error;
      }
    });

    await this.writeAuditEvent({
      eventType: 'catalog.linking.parameter_linked',
      entityType: 'lab_test_parameter',
      entityId: linked.id,
      payload: {
        test_id: dto.testId,
        parameter_id: dto.parameterId,
      },
    });

    return this.mapParameterDetail(linked);
  }

  async unlinkTestParameter(dto: UnlinkTestParameterDto) {
    const tenantId = this.tenantId;

    const unlinked = await this.prisma.$transaction(async (tx) => {
      const parameter = await tx.labTestParameter.findFirst({
        where: {
          id: dto.parameterId,
          tenantId,
        },
        include: {
          test: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      });

      if (!parameter) {
        throw new NotFoundException('LAB parameter not found');
      }

      if (parameter.testId !== dto.testId) {
        throw new DomainException(
          'PARAMETER_TEST_MISMATCH',
          'Parameter is not linked to the requested test',
        );
      }

      if (!parameter.active) {
        return parameter;
      }

      return tx.labTestParameter.update({
        where: {
          id: parameter.id,
        },
        data: {
          active: false,
        },
        include: {
          test: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      });
    });

    await this.writeAuditEvent({
      eventType: 'catalog.linking.parameter_unlinked',
      entityType: 'lab_test_parameter',
      entityId: unlinked.id,
      payload: {
        test_id: dto.testId,
        parameter_id: dto.parameterId,
      },
    });

    return this.mapParameterDetail(unlinked);
  }

  async listReferenceRanges(testId: string) {
    await this.assertTestExists(testId);

    const where = {
      tenantId: this.tenantId,
      testId,
    };

    const [data, total] = await Promise.all([
      this.prisma.labReferenceRange.findMany({
        where,
        orderBy: [
          { parameterId: 'asc' },
          { sex: 'asc' },
          { ageMinDays: 'asc' },
          { ageMaxDays: 'asc' },
          { createdAt: 'asc' },
        ],
      }),
      this.prisma.labReferenceRange.count({ where }),
    ]);

    return {
      data,
      total,
    };
  }

  async upsertReferenceRange(testId: string, dto: UpsertReferenceRangeDto) {
    if (
      dto.ageMinDays !== undefined &&
      dto.ageMaxDays !== undefined &&
      dto.ageMinDays > dto.ageMaxDays
    ) {
      throw new DomainException(
        'INVALID_AGE_RANGE',
        'ageMinDays cannot be greater than ageMaxDays',
      );
    }

    const tenantId = this.tenantId;
    const test = await this.assertTestExists(testId);

    const parameter = await this.prisma.labTestParameter.findFirst({
      where: {
        id: dto.parameterId,
        tenantId,
      },
      select: {
        id: true,
        testId: true,
      },
    });

    if (!parameter) {
      throw new NotFoundException('LAB parameter not found');
    }

    if (parameter.testId !== test.id) {
      throw new DomainException(
        'PARAMETER_TEST_MISMATCH',
        'Parameter does not belong to the specified test',
      );
    }

    const upserted = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.labReferenceRange.findFirst({
        where: {
          tenantId,
          testId,
          parameterId: dto.parameterId,
          sex: dto.sex ?? null,
          ageMinDays: dto.ageMinDays ?? null,
          ageMaxDays: dto.ageMaxDays ?? null,
        },
      });

      if (existing) {
        return tx.labReferenceRange.update({
          where: {
            id: existing.id,
          },
          data: {
            low: dto.low ?? null,
            high: dto.high ?? null,
            textRange: dto.textRange?.trim() || null,
          },
        });
      }

      return tx.labReferenceRange.create({
        data: {
          tenantId,
          testId,
          parameterId: dto.parameterId,
          sex: dto.sex ?? null,
          ageMinDays: dto.ageMinDays ?? null,
          ageMaxDays: dto.ageMaxDays ?? null,
          low: dto.low ?? null,
          high: dto.high ?? null,
          textRange: dto.textRange?.trim() || null,
        },
      });
    });

    await this.writeAuditEvent({
      eventType: 'catalog.reference_range.upserted',
      entityType: 'lab_reference_range',
      entityId: upserted.id,
      payload: {
        test_id: testId,
        parameter_id: dto.parameterId,
      },
    });

    return upserted;
  }

  async createCatalogImportJob(
    file: UploadedCatalogFile | undefined,
    mode?: string,
  ) {
    if (!file) {
      throw new DomainException('IMPORT_FILE_MISSING', 'XLSX file is required');
    }

    const normalizedMode = (mode ?? 'MERGE').trim().toUpperCase();
    if (normalizedMode !== 'MERGE' && normalizedMode !== 'REPLACE') {
      throw new DomainException(
        'INVALID_IMPORT_MODE',
        'Import mode must be MERGE or REPLACE',
      );
    }

    const tenantId = this.tenantId;
    const fileName = file.originalname || 'catalog-import.xlsx';
    const hasZipHeader =
      file.buffer.length >= 2 &&
      file.buffer[0] === 0x50 &&
      file.buffer[1] === 0x4b;
    const isXlsx = fileName.toLowerCase().endsWith('.xlsx') && hasZipHeader;

    if (!isXlsx) {
      const rowErrors = [
        {
          row: 1,
          code: 'INVALID_FILE_FORMAT',
          field: 'file',
          message: 'Expected .xlsx file',
        },
      ];

      const failedJob = await this.prisma.catalogImportJob.create({
        data: {
          tenantId,
          fileName,
          mode: normalizedMode,
          status: 'FAILED',
          processedRows: 1,
          successRows: 0,
          failedRows: 1,
          errorJson: rowErrors,
          createdBy: this.actorIdentity,
        },
      });

      await this.writeAuditEvent({
        eventType: 'catalog.import.failed',
        entityType: 'catalog_import_job',
        entityId: failedJob.id,
        payload: {
          reason: 'INVALID_FILE_FORMAT',
        },
      });

      throw new DomainException(
        'CATALOG_IMPORT_VALIDATION_FAILED',
        'Catalog import validation failed',
        {
          job_id: failedJob.id,
          row_errors: rowErrors,
        },
      );
    }

    const job = await this.prisma.catalogImportJob.create({
      data: {
        tenantId,
        fileName,
        mode: normalizedMode,
        status: 'COMPLETED',
        processedRows: 0,
        successRows: 0,
        failedRows: 0,
        errorJson: [],
        createdBy: this.actorIdentity,
      },
    });

    await this.writeAuditEvent({
      eventType: 'catalog.import.completed',
      entityType: 'catalog_import_job',
      entityId: job.id,
      payload: {
        file_name: job.fileName,
        mode: job.mode,
      },
    });

    return this.mapImportJob(job);
  }

  async listCatalogImportJobs() {
    const where = {
      tenantId: this.tenantId,
    };

    const [jobs, total] = await Promise.all([
      this.prisma.catalogImportJob.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.catalogImportJob.count({ where }),
    ]);

    return {
      data: jobs.map((job) => this.mapImportJob(job)),
      total,
    };
  }

  async getCatalogImportJob(jobId: string) {
    const job = await this.prisma.catalogImportJob.findFirst({
      where: {
        id: jobId,
        tenantId: this.tenantId,
      },
    });

    if (!job) {
      throw new NotFoundException('Catalog import job not found');
    }

    return this.mapImportJob(job);
  }

  async createCatalogExportJob(dto: CreateCatalogExportDto) {
    const entity = dto.entity;
    const content = await this.buildExportContent(entity);
    const now = new Date();

    const job = await this.prisma.catalogExportJob.create({
      data: {
        tenantId: this.tenantId,
        entity,
        status: 'COMPLETED',
        fileName: `catalog-${entity.toLowerCase()}-${now.getTime()}.xlsx`,
        fileBytes: Buffer.from(content, 'utf8'),
        createdBy: this.actorIdentity,
      },
    });

    await this.writeAuditEvent({
      eventType: 'catalog.export.completed',
      entityType: 'catalog_export_job',
      entityId: job.id,
      payload: {
        entity,
      },
    });

    return this.mapExportJob(job);
  }

  async listCatalogExportJobs() {
    const where = {
      tenantId: this.tenantId,
    };

    const [jobs, total] = await Promise.all([
      this.prisma.catalogExportJob.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.catalogExportJob.count({ where }),
    ]);

    return {
      data: jobs.map((job) => this.mapExportJob(job)),
      total,
    };
  }

  async getCatalogExportFile(jobId: string) {
    const job = await this.prisma.catalogExportJob.findFirst({
      where: {
        id: jobId,
        tenantId: this.tenantId,
      },
    });

    if (!job) {
      throw new NotFoundException('Catalog export job not found');
    }

    if (job.status !== 'COMPLETED' || !job.fileBytes) {
      throw new DomainException(
        'EXPORT_FILE_NOT_READY',
        'Catalog export file is not ready',
      );
    }

    return {
      fileName: job.fileName ?? `catalog-${job.entity.toLowerCase()}.xlsx`,
      bytes: Buffer.from(job.fileBytes),
    };
  }

  private async assertTestExists(testId: string) {
    const test = await this.prisma.labTestDefinition.findFirst({
      where: {
        id: testId,
        tenantId: this.tenantId,
      },
    });

    if (!test) {
      throw new NotFoundException('LAB test not found');
    }

    return test;
  }

  private async loadPanel(
    source: Prisma.TransactionClient | PrismaService,
    panelId: string,
  ) {
    return source.labPanel.findFirst({
      where: {
        id: panelId,
        tenantId: this.tenantId,
      },
      include: {
        tests: {
          include: {
            test: {
              select: {
                code: true,
                name: true,
              },
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
  }

  private async requirePanel(
    source: Prisma.TransactionClient,
    panelId: string,
  ) {
    const panel = await this.loadPanel(source, panelId);
    if (!panel) {
      throw new NotFoundException('Panel not found');
    }
    return panel;
  }

  private async rewritePanelTests(
    tx: Prisma.TransactionClient,
    panelId: string,
    orderedTestIds: string[],
  ) {
    await tx.labPanelTest.deleteMany({
      where: {
        tenantId: this.tenantId,
        panelId,
      },
    });

    if (orderedTestIds.length === 0) {
      return;
    }

    await tx.labPanelTest.createMany({
      data: orderedTestIds.map((testId, index) => ({
        tenantId: this.tenantId,
        panelId,
        testId,
        sortOrder: index,
      })),
    });
  }

  private clampIndex(
    value: number | undefined,
    length: number,
  ): number | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value < 0) {
      return 0;
    }

    if (value > length) {
      return length;
    }

    return value;
  }

  private mapPanel(panel: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    tests: Array<{
      id: string;
      panelId: string;
      testId: string;
      sortOrder: number;
      test: {
        code: string;
        name: string;
      };
    }>;
  }) {
    return {
      id: panel.id,
      code: panel.code,
      name: panel.name,
      description: panel.description,
      active: panel.active,
      tests: panel.tests.map((testLink) => ({
        id: testLink.id,
        panelId: testLink.panelId,
        testId: testLink.testId,
        sortOrder: testLink.sortOrder,
        testCode: testLink.test.code,
        testName: testLink.test.name,
      })),
      createdAt: panel.createdAt,
      updatedAt: panel.updatedAt,
    };
  }

  private mapParameterDetail(parameter: {
    id: string;
    testId: string;
    name: string;
    unit: string | null;
    refLow: number | null;
    refHigh: number | null;
    refText: string | null;
    displayOrder: number;
    active: boolean;
    test: {
      code: string;
      name: string;
    };
  }) {
    return {
      id: parameter.id,
      testId: parameter.testId,
      name: parameter.name,
      unit: parameter.unit,
      refLow: parameter.refLow,
      refHigh: parameter.refHigh,
      refText: parameter.refText,
      displayOrder: parameter.displayOrder,
      active: parameter.active,
      testCode: parameter.test.code,
      testName: parameter.test.name,
      dataType:
        parameter.refLow !== null || parameter.refHigh !== null
          ? 'NUMERIC'
          : 'TEXT',
      referenceDefaults: {
        low: parameter.refLow,
        high: parameter.refHigh,
        text: parameter.refText,
      },
    };
  }

  private mapImportJob(job: {
    id: string;
    status: string;
    fileName: string;
    mode: string;
    processedRows: number;
    successRows: number;
    failedRows: number;
    errorJson: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: job.id,
      status: job.status,
      fileName: job.fileName,
      mode: job.mode,
      processedRows: job.processedRows,
      successRows: job.successRows,
      failedRows: job.failedRows,
      errors: Array.isArray(job.errorJson) ? job.errorJson : [],
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  private mapExportJob(job: {
    id: string;
    status: string;
    entity: string;
    fileName: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: job.id,
      status: job.status,
      entity: job.entity,
      fileName: job.fileName,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  private async buildExportContent(entity: 'TESTS' | 'PARAMETERS' | 'PANELS') {
    const tenantId = this.tenantId;

    if (entity === 'TESTS') {
      const tests = await this.prisma.labTestDefinition.findMany({
        where: { tenantId },
        orderBy: [{ department: 'asc' }, { code: 'asc' }],
      });

      const rows = ['code,name,department,active'];
      for (const test of tests) {
        rows.push(
          [test.code, test.name, test.department, String(test.active)].join(
            ',',
          ),
        );
      }

      return rows.join('\n');
    }

    if (entity === 'PARAMETERS') {
      const parameters = await this.prisma.labTestParameter.findMany({
        where: { tenantId },
        include: {
          test: {
            select: {
              code: true,
            },
          },
        },
        orderBy: [{ testId: 'asc' }, { displayOrder: 'asc' }],
      });

      const rows = ['test_code,name,unit,ref_low,ref_high,ref_text,active'];
      for (const parameter of parameters) {
        rows.push(
          [
            parameter.test.code,
            parameter.name,
            parameter.unit ?? '',
            parameter.refLow ?? '',
            parameter.refHigh ?? '',
            parameter.refText ?? '',
            String(parameter.active),
          ].join(','),
        );
      }

      return rows.join('\n');
    }

    const panels = await this.prisma.labPanel.findMany({
      where: { tenantId },
      include: {
        tests: {
          include: {
            test: {
              select: {
                code: true,
              },
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ code: 'asc' }],
    });

    const rows = ['panel_code,panel_name,test_code,sort_order,active'];
    for (const panel of panels) {
      if (panel.tests.length === 0) {
        rows.push(
          [panel.code, panel.name, '', '', String(panel.active)].join(','),
        );
        continue;
      }

      for (const testLink of panel.tests) {
        rows.push(
          [
            panel.code,
            panel.name,
            testLink.test.code,
            String(testLink.sortOrder),
            String(panel.active),
          ].join(','),
        );
      }
    }

    return rows.join('\n');
  }

  private async writeAuditEvent(input: {
    eventType: string;
    entityType: string;
    entityId: string;
    payload: Record<string, unknown>;
  }) {
    await this.prisma.auditEvent.create({
      data: {
        tenantId: this.tenantId,
        actorUserId: this.actorIdentity,
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        payloadJson: JSON.stringify(input.payload),
        correlationId: this.cls.get<string>('REQUEST_ID') ?? null,
      },
    });
  }
}
