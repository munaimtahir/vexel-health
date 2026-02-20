import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { DomainException } from '../common/errors/domain.exception';

@Injectable()
export class CatalogService {
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

  private decimalToNumber(d: Decimal | null): number | null {
    return d == null ? null : Number(d);
  }

  // --- CatalogVersion ---
  async listVersions(status?: string, page = 1) {
    const where: Prisma.CatalogVersionWhereInput = { tenantId: this.tenantId };
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.catalogVersion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * 20,
        take: 20,
      }),
      this.prisma.catalogVersion.count({ where }),
    ]);
    return {
      data: data.map((v) => ({
        id: v.id,
        tenantId: v.tenantId,
        versionTag: v.versionTag,
        status: v.status,
        sha256Manifest: v.sha256Manifest,
        createdBy: v.createdBy,
        createdAt: v.createdAt.toISOString(),
        notes: v.notes,
      })),
      total,
    };
  }

  async createVersion(body: { versionTag?: string; notes?: string }) {
    const versionTag =
      body.versionTag ??
      `draft-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}`;
    const v = await this.prisma.catalogVersion.create({
      data: {
        tenantId: this.tenantId,
        versionTag,
        status: 'draft',
        createdBy: this.userId,
        notes: body.notes ?? null,
      },
    });
    return this.mapVersion(v);
  }

  async publishVersion(versionId: string) {
    const v = await this.prisma.catalogVersion.findFirst({
      where: { id: versionId, tenantId: this.tenantId },
    });
    if (!v) throw new NotFoundException('Catalog version not found');
    if (v.status !== 'draft')
      throw new DomainException(
        'CATALOG_VERSION_NOT_DRAFT',
        'Only draft versions can be published',
      );
    const updated = await this.prisma.catalogVersion.update({
      where: { id: versionId },
      data: { status: 'published' },
    });
    return this.mapVersion(updated);
  }

  private mapVersion(v: {
    id: string;
    tenantId: string;
    versionTag: string;
    status: string;
    sha256Manifest: string | null;
    createdBy: string | null;
    createdAt: Date;
    notes: string | null;
  }) {
    return {
      id: v.id,
      tenantId: v.tenantId,
      versionTag: v.versionTag,
      status: v.status,
      sha256Manifest: v.sha256Manifest,
      createdBy: v.createdBy,
      createdAt: v.createdAt.toISOString(),
      notes: v.notes,
    };
  }

  // --- TestDefinition ---
  async listTests(status?: string, section?: string, page = 1) {
    const where: Prisma.TestDefinitionWhereInput = { tenantId: this.tenantId };
    if (status) where.status = status;
    if (section) where.section = section;
    const [data, total] = await Promise.all([
      this.prisma.testDefinition.findMany({
        where,
        orderBy: [{ section: 'asc' }, { testName: 'asc' }, { testCode: 'asc' }],
        skip: (page - 1) * 50,
        take: 50,
      }),
      this.prisma.testDefinition.count({ where }),
    ]);
    return { data: data.map((t) => this.mapTest(t)), total };
  }

  async createTest(body: {
    testCode: string;
    testName: string;
    section?: string;
    specimenTypeId?: string;
    tatMinutes?: number;
    status?: string;
    layoutKey: string;
  }) {
    const code = body.testCode.trim().toUpperCase();
    try {
      const t = await this.prisma.testDefinition.create({
        data: {
          tenantId: this.tenantId,
          testCode: code,
          testName: body.testName.trim(),
          section: body.section?.trim() ?? null,
          specimenTypeId: body.specimenTypeId ?? null,
          tatMinutes: body.tatMinutes ?? null,
          status: body.status ?? 'active',
          layoutKey: body.layoutKey.trim(),
        },
      });
      return this.mapTest(t);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        throw new DomainException(
          'CATALOG_TEST_CODE_CONFLICT',
          'Test code already exists',
        );
      throw e;
    }
  }

  async getTestById(testId: string) {
    const t = await this.prisma.testDefinition.findFirst({
      where: { id: testId, tenantId: this.tenantId },
    });
    if (!t) throw new NotFoundException('Test not found');
    return this.mapTest(t);
  }

  async updateTest(
    testId: string,
    body: {
      testName?: string;
      section?: string;
      specimenTypeId?: string;
      tatMinutes?: number;
      status?: string;
      layoutKey?: string;
    },
  ) {
    await this.getTestById(testId);
    const t = await this.prisma.testDefinition.update({
      where: { id: testId },
      data: {
        ...(body.testName != null && { testName: body.testName.trim() }),
        ...(body.section !== undefined && {
          section: body.section?.trim() ?? null,
        }),
        ...(body.specimenTypeId !== undefined && {
          specimenTypeId: body.specimenTypeId ?? null,
        }),
        ...(body.tatMinutes !== undefined && {
          tatMinutes: body.tatMinutes ?? null,
        }),
        ...(body.status != null && { status: body.status }),
        ...(body.layoutKey != null && { layoutKey: body.layoutKey.trim() }),
      },
    });
    return this.mapTest(t);
  }

  private mapTest(t: {
    id: string;
    tenantId: string;
    testCode: string;
    testName: string;
    section: string | null;
    specimenTypeId: string | null;
    tatMinutes: number | null;
    status: string;
    layoutKey: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: t.id,
      tenantId: t.tenantId,
      testCode: t.testCode,
      testName: t.testName,
      section: t.section,
      specimenTypeId: t.specimenTypeId,
      tatMinutes: t.tatMinutes,
      status: t.status,
      layoutKey: t.layoutKey,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  // --- ParameterDefinition ---
  async listParameters(status?: string, page = 1) {
    const where: Prisma.ParameterDefinitionWhereInput = {
      tenantId: this.tenantId,
    };
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.parameterDefinition.findMany({
        where,
        orderBy: [{ parameterCode: 'asc' }],
        skip: (page - 1) * 50,
        take: 50,
      }),
      this.prisma.parameterDefinition.count({ where }),
    ]);
    return { data: data.map((p) => this.mapParameter(p)), total };
  }

  async createParameter(body: {
    parameterCode: string;
    parameterName: string;
    resultType: string;
    unitId?: string;
    precision?: number;
    defaultValue?: string;
    enumOptions?: string[];
    formulaSpec?: string;
    status?: string;
  }) {
    const code = body.parameterCode.trim().toUpperCase();
    try {
      const p = await this.prisma.parameterDefinition.create({
        data: {
          tenantId: this.tenantId,
          parameterCode: code,
          parameterName: body.parameterName.trim(),
          resultType: body.resultType,
          unitId: body.unitId ?? null,
          precision: body.precision ?? null,
          defaultValue: body.defaultValue ?? null,
          enumOptions: body.enumOptions ?? undefined,
          formulaSpec: body.formulaSpec?.trim() ?? null,
          status: body.status ?? 'active',
        },
      });
      return this.mapParameter(p);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        throw new DomainException(
          'CATALOG_PARAMETER_CODE_CONFLICT',
          'Parameter code already exists',
        );
      throw e;
    }
  }

  async getParameterById(parameterId: string) {
    const p = await this.prisma.parameterDefinition.findFirst({
      where: { id: parameterId, tenantId: this.tenantId },
    });
    if (!p) throw new NotFoundException('Parameter not found');
    return this.mapParameter(p);
  }

  async updateParameter(
    parameterId: string,
    body: {
      parameterName?: string;
      resultType?: string;
      unitId?: string;
      precision?: number;
      defaultValue?: string;
      enumOptions?: string[];
      formulaSpec?: string;
      status?: string;
    },
  ) {
    await this.getParameterById(parameterId);
    const p = await this.prisma.parameterDefinition.update({
      where: { id: parameterId },
      data: {
        ...(body.parameterName != null && {
          parameterName: body.parameterName.trim(),
        }),
        ...(body.resultType != null && { resultType: body.resultType }),
        ...(body.unitId !== undefined && { unitId: body.unitId ?? null }),
        ...(body.precision !== undefined && {
          precision: body.precision ?? null,
        }),
        ...(body.defaultValue !== undefined && {
          defaultValue: body.defaultValue ?? null,
        }),
        ...(body.enumOptions !== undefined && {
          enumOptions: body.enumOptions ?? null,
        }),
        ...(body.formulaSpec !== undefined && {
          formulaSpec: body.formulaSpec?.trim() ?? null,
        }),
        ...(body.status != null && { status: body.status }),
      },
    });
    return this.mapParameter(p);
  }

  private mapParameter(p: {
    id: string;
    tenantId: string;
    parameterCode: string;
    parameterName: string;
    resultType: string;
    unitId: string | null;
    precision: number | null;
    defaultValue: string | null;
    enumOptions: unknown;
    formulaSpec: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: p.id,
      tenantId: p.tenantId,
      parameterCode: p.parameterCode,
      parameterName: p.parameterName,
      resultType: p.resultType,
      unitId: p.unitId,
      precision: p.precision,
      defaultValue: p.defaultValue,
      enumOptions: p.enumOptions,
      formulaSpec: p.formulaSpec,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  // --- TestParameterMap ---
  async listTestMapping(testId: string) {
    await this.getTestById(testId);
    const rows = await this.prisma.testParameterMap.findMany({
      where: { tenantId: this.tenantId, testId },
      orderBy: { displayOrder: 'asc' },
      include: { parameter: true },
    });
    return {
      data: rows.map((m) => ({
        ...this.mapMapping(m),
        parameter: this.mapParameter(m.parameter),
      })),
      total: rows.length,
    };
  }

  async addTestMapping(
    testId: string,
    body: {
      parameterId: string;
      displayOrder?: number;
      required?: boolean;
      visibility?: string;
      readOnly?: boolean;
      printFlag?: boolean;
    },
  ) {
    await this.getTestById(testId);
    await this.getParameterById(body.parameterId);
    const nextOrder =
      body.displayOrder ??
      (await this.prisma.testParameterMap
        .aggregate({
          where: { testId, tenantId: this.tenantId },
          _max: { displayOrder: true },
        })
        .then((r) => (r._max.displayOrder ?? -1) + 1));
    try {
      const m = await this.prisma.testParameterMap.create({
        data: {
          tenantId: this.tenantId,
          testId,
          parameterId: body.parameterId,
          displayOrder: nextOrder,
          required: body.required ?? true,
          visibility: body.visibility ?? 'normal',
          readOnly: body.readOnly ?? false,
          printFlag: body.printFlag ?? true,
        },
        include: { parameter: true },
      });
      return {
        ...this.mapMapping(m),
        parameter: this.mapParameter(m.parameter),
      };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        throw new DomainException(
          'CATALOG_MAPPING_EXISTS',
          'This parameter is already mapped to this test',
        );
      throw e;
    }
  }

  async reorderTestMapping(testId: string, parameterIds: string[]) {
    await this.getTestById(testId);
    const updates = parameterIds.map((parameterId, i) =>
      this.prisma.testParameterMap.updateMany({
        where: { tenantId: this.tenantId, testId, parameterId },
        data: { displayOrder: i },
      }),
    );
    await this.prisma.$transaction(updates);
    return this.listTestMapping(testId);
  }

  async updateTestMapping(
    testId: string,
    mappingId: string,
    body: {
      displayOrder?: number;
      required?: boolean;
      visibility?: string;
      readOnly?: boolean;
      printFlag?: boolean;
    },
  ) {
    await this.getMappingOrThrow(testId, mappingId);
    const m = await this.prisma.testParameterMap.update({
      where: { id: mappingId },
      data: {
        ...(body.displayOrder !== undefined && {
          displayOrder: body.displayOrder,
        }),
        ...(body.required !== undefined && { required: body.required }),
        ...(body.visibility != null && { visibility: body.visibility }),
        ...(body.readOnly !== undefined && { readOnly: body.readOnly }),
        ...(body.printFlag !== undefined && { printFlag: body.printFlag }),
      },
      include: { parameter: true },
    });
    return { ...this.mapMapping(m), parameter: this.mapParameter(m.parameter) };
  }

  async deleteTestMapping(testId: string, mappingId: string) {
    await this.getMappingOrThrow(testId, mappingId);
    await this.prisma.testParameterMap.delete({ where: { id: mappingId } });
  }

  private async getMappingOrThrow(testId: string, mappingId: string) {
    const m = await this.prisma.testParameterMap.findFirst({
      where: { id: mappingId, testId, tenantId: this.tenantId },
    });
    if (!m) throw new NotFoundException('Mapping not found');
    return m;
  }

  private mapMapping(m: {
    id: string;
    tenantId: string;
    testId: string;
    parameterId: string;
    displayOrder: number;
    required: boolean;
    visibility: string;
    readOnly: boolean;
    printFlag: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: m.id,
      tenantId: m.tenantId,
      testId: m.testId,
      parameterId: m.parameterId,
      displayOrder: m.displayOrder,
      required: m.required,
      visibility: m.visibility,
      readOnly: m.readOnly,
      printFlag: m.printFlag,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    };
  }

  // --- ParameterReferenceRange ---
  async listReferenceRanges(parameterId: string) {
    await this.getParameterById(parameterId);
    const data = await this.prisma.parameterReferenceRange.findMany({
      where: { tenantId: this.tenantId, parameterId },
      orderBy: [{ priority: 'desc' }, { ageMinDays: 'asc' }],
    });
    return {
      data: data.map((r) => this.mapRefRange(r)),
      total: data.length,
    };
  }

  async createReferenceRange(
    parameterId: string,
    body: {
      sex: string;
      ageMinDays?: number;
      ageMaxDays?: number;
      refLow?: number;
      refHigh?: number;
      refText?: string;
      priority?: number;
      effectiveFrom?: string;
      effectiveTo?: string;
      notes?: string;
    },
  ) {
    await this.getParameterById(parameterId);
    const r = await this.prisma.parameterReferenceRange.create({
      data: {
        tenantId: this.tenantId,
        parameterId,
        sex: body.sex,
        ageMinDays: body.ageMinDays ?? null,
        ageMaxDays: body.ageMaxDays ?? null,
        refLow: body.refLow != null ? new Prisma.Decimal(body.refLow) : null,
        refHigh: body.refHigh != null ? new Prisma.Decimal(body.refHigh) : null,
        refText: body.refText ?? null,
        priority: body.priority ?? 0,
        effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : null,
        effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
        notes: body.notes ?? null,
      },
    });
    return this.mapRefRange(r);
  }

  async updateReferenceRange(
    parameterId: string,
    rangeId: string,
    body: {
      sex?: string;
      ageMinDays?: number;
      ageMaxDays?: number;
      refLow?: number;
      refHigh?: number;
      refText?: string;
      priority?: number;
      effectiveFrom?: string;
      effectiveTo?: string;
      notes?: string;
    },
  ) {
    await this.getParameterById(parameterId);
    const r = await this.prisma.parameterReferenceRange.findFirst({
      where: { id: rangeId, parameterId, tenantId: this.tenantId },
    });
    if (!r) throw new NotFoundException('Reference range not found');
    const updated = await this.prisma.parameterReferenceRange.update({
      where: { id: rangeId },
      data: {
        ...(body.sex != null && { sex: body.sex }),
        ...(body.ageMinDays !== undefined && {
          ageMinDays: body.ageMinDays ?? null,
        }),
        ...(body.ageMaxDays !== undefined && {
          ageMaxDays: body.ageMaxDays ?? null,
        }),
        ...(body.refLow !== undefined && {
          refLow: body.refLow != null ? new Prisma.Decimal(body.refLow) : null,
        }),
        ...(body.refHigh !== undefined && {
          refHigh:
            body.refHigh != null ? new Prisma.Decimal(body.refHigh) : null,
        }),
        ...(body.refText !== undefined && { refText: body.refText ?? null }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.effectiveFrom !== undefined && {
          effectiveFrom: body.effectiveFrom
            ? new Date(body.effectiveFrom)
            : null,
        }),
        ...(body.effectiveTo !== undefined && {
          effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
        }),
        ...(body.notes !== undefined && { notes: body.notes ?? null }),
      },
    });
    return this.mapRefRange(updated);
  }

  async deleteReferenceRange(parameterId: string, rangeId: string) {
    const r = await this.prisma.parameterReferenceRange.findFirst({
      where: { id: rangeId, parameterId, tenantId: this.tenantId },
    });
    if (!r) throw new NotFoundException('Reference range not found');
    await this.prisma.parameterReferenceRange.delete({
      where: { id: rangeId },
    });
  }

  private mapRefRange(r: {
    id: string;
    tenantId: string;
    parameterId: string;
    sex: string;
    ageMinDays: number | null;
    ageMaxDays: number | null;
    refLow: Decimal | null;
    refHigh: Decimal | null;
    refText: string | null;
    priority: number;
    effectiveFrom: Date | null;
    effectiveTo: Date | null;
    notes: string | null;
  }) {
    return {
      id: r.id,
      tenantId: r.tenantId,
      parameterId: r.parameterId,
      sex: r.sex,
      ageMinDays: r.ageMinDays,
      ageMaxDays: r.ageMaxDays,
      refLow: this.decimalToNumber(r.refLow),
      refHigh: this.decimalToNumber(r.refHigh),
      refText: r.refText,
      priority: r.priority,
      effectiveFrom: r.effectiveFrom?.toISOString() ?? null,
      effectiveTo: r.effectiveTo?.toISOString() ?? null,
      notes: r.notes,
    };
  }

  // --- ReportLayoutRule ---
  async listLayouts() {
    const data = await this.prisma.reportLayoutRule.findMany({
      where: { tenantId: this.tenantId },
      orderBy: { layoutKey: 'asc' },
    });
    return {
      data: data.map((l) => this.mapLayout(l)),
      total: data.length,
    };
  }

  async createLayout(body: {
    layoutKey: string;
    groupingStrategy?: string;
    pageBreakPolicy?: string;
    maxTestsPerPage?: number;
    allowedCombineWith?: string[];
    renderStyle?: string;
  }) {
    try {
      const l = await this.prisma.reportLayoutRule.create({
        data: {
          tenantId: this.tenantId,
          layoutKey: body.layoutKey.trim(),
          groupingStrategy: body.groupingStrategy ?? 'by_layout_key',
          pageBreakPolicy: body.pageBreakPolicy ?? 'never',
          maxTestsPerPage: body.maxTestsPerPage ?? null,
          allowedCombineWith: body.allowedCombineWith ?? undefined,
          renderStyle: body.renderStyle ?? 'table',
        },
      });
      return this.mapLayout(l);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        throw new DomainException(
          'CATALOG_LAYOUT_KEY_CONFLICT',
          'Layout key already exists',
        );
      throw e;
    }
  }

  async getLayoutById(layoutId: string) {
    const l = await this.prisma.reportLayoutRule.findFirst({
      where: { id: layoutId, tenantId: this.tenantId },
    });
    if (!l) throw new NotFoundException('Layout not found');
    return this.mapLayout(l);
  }

  async updateLayout(
    layoutId: string,
    body: {
      groupingStrategy?: string;
      pageBreakPolicy?: string;
      maxTestsPerPage?: number;
      allowedCombineWith?: string[];
      renderStyle?: string;
    },
  ) {
    await this.getLayoutById(layoutId);
    const l = await this.prisma.reportLayoutRule.update({
      where: { id: layoutId },
      data: {
        ...(body.groupingStrategy != null && {
          groupingStrategy: body.groupingStrategy,
        }),
        ...(body.pageBreakPolicy != null && {
          pageBreakPolicy: body.pageBreakPolicy,
        }),
        ...(body.maxTestsPerPage !== undefined && {
          maxTestsPerPage: body.maxTestsPerPage ?? null,
        }),
        ...(body.allowedCombineWith !== undefined && {
          allowedCombineWith: body.allowedCombineWith,
        }),
        ...(body.renderStyle != null && { renderStyle: body.renderStyle }),
      },
    });
    return this.mapLayout(l);
  }

  private mapLayout(l: {
    id: string;
    tenantId: string;
    layoutKey: string;
    groupingStrategy: string;
    pageBreakPolicy: string;
    maxTestsPerPage: number | null;
    allowedCombineWith: unknown;
    renderStyle: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: l.id,
      tenantId: l.tenantId,
      layoutKey: l.layoutKey,
      groupingStrategy: l.groupingStrategy,
      pageBreakPolicy: l.pageBreakPolicy,
      maxTestsPerPage: l.maxTestsPerPage,
      allowedCombineWith: l.allowedCombineWith,
      renderStyle: l.renderStyle,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    };
  }

  // --- TestAnnotation ---
  async listAnnotations(testId?: string, parameterId?: string) {
    const where: Prisma.TestAnnotationWhereInput = { tenantId: this.tenantId };
    if (testId) where.testId = testId;
    if (parameterId) where.parameterId = parameterId;
    const data = await this.prisma.testAnnotation.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
    return {
      data: data.map((a) => this.mapAnnotation(a)),
      total: data.length,
    };
  }

  async createAnnotation(body: {
    testId?: string;
    parameterId?: string;
    annotationType: string;
    placement: string;
    text: string;
    visibilityRule?: string;
    conditionSpec?: string;
    displayOrder?: number;
  }) {
    if (body.testId && body.parameterId)
      throw new DomainException(
        'CATALOG_ANNOTATION_EXACTLY_ONE',
        'Exactly one of testId or parameterId must be set',
      );
    if (!body.testId && !body.parameterId)
      throw new DomainException(
        'CATALOG_ANNOTATION_EXACTLY_ONE',
        'Exactly one of testId or parameterId must be set',
      );
    const a = await this.prisma.testAnnotation.create({
      data: {
        tenantId: this.tenantId,
        testId: body.testId ?? null,
        parameterId: body.parameterId ?? null,
        annotationType: body.annotationType,
        placement: body.placement,
        text: body.text,
        visibilityRule: body.visibilityRule ?? 'always',
        conditionSpec: body.conditionSpec ?? null,
        displayOrder: body.displayOrder ?? 0,
      },
    });
    return this.mapAnnotation(a);
  }

  async getAnnotationById(annotationId: string) {
    const a = await this.prisma.testAnnotation.findFirst({
      where: { id: annotationId, tenantId: this.tenantId },
    });
    if (!a) throw new NotFoundException('Annotation not found');
    return this.mapAnnotation(a);
  }

  async updateAnnotation(
    annotationId: string,
    body: {
      annotationType?: string;
      placement?: string;
      text?: string;
      visibilityRule?: string;
      conditionSpec?: string;
      displayOrder?: number;
    },
  ) {
    await this.getAnnotationById(annotationId);
    const a = await this.prisma.testAnnotation.update({
      where: { id: annotationId },
      data: {
        ...(body.annotationType != null && {
          annotationType: body.annotationType,
        }),
        ...(body.placement != null && { placement: body.placement }),
        ...(body.text != null && { text: body.text }),
        ...(body.visibilityRule != null && {
          visibilityRule: body.visibilityRule,
        }),
        ...(body.conditionSpec !== undefined && {
          conditionSpec: body.conditionSpec ?? null,
        }),
        ...(body.displayOrder !== undefined && {
          displayOrder: body.displayOrder,
        }),
      },
    });
    return this.mapAnnotation(a);
  }

  async deleteAnnotation(annotationId: string) {
    await this.getAnnotationById(annotationId);
    await this.prisma.testAnnotation.delete({ where: { id: annotationId } });
  }

  private mapAnnotation(a: {
    id: string;
    tenantId: string;
    testId: string | null;
    parameterId: string | null;
    annotationType: string;
    placement: string;
    text: string;
    visibilityRule: string;
    conditionSpec: string | null;
    displayOrder: number;
  }) {
    return {
      id: a.id,
      tenantId: a.tenantId,
      testId: a.testId,
      parameterId: a.parameterId,
      annotationType: a.annotationType,
      placement: a.placement,
      text: a.text,
      visibilityRule: a.visibilityRule,
      conditionSpec: a.conditionSpec,
      displayOrder: a.displayOrder,
    };
  }
}
