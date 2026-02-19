import { Prisma } from '@prisma/client';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { normalizeCatalogText } from '../common/lab/lab-catalog-integrity.util';
import { DomainException } from '../common/errors/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import { AddParameterDto } from './dto/add-parameter.dto';
import { CreateTestDto } from './dto/create-test.dto';

@Injectable()
export class LabCatalogService {
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

  async createTest(dto: CreateTestDto) {
    const tenantId = this.tenantId;

    try {
      return await this.prisma.labTestDefinition.create({
        data: {
          tenantId,
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          department: dto.department.trim(),
          active: dto.active ?? true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new DomainException(
          'LAB_TEST_CODE_CONFLICT',
          'A LAB test with this code already exists',
        );
      }
      throw error;
    }
  }

  async listTests() {
    const tenantId = this.tenantId;
    const where = { tenantId };

    const [data, total] = await Promise.all([
      this.prisma.labTestDefinition.findMany({
        where,
        orderBy: [
          { department: 'asc' },
          { name: 'asc' },
          { code: 'asc' },
        ],
      }),
      this.prisma.labTestDefinition.count({ where }),
    ]);

    return { data, total };
  }

  async getTestById(testId: string) {
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

  async addParameter(testId: string, dto: AddParameterDto) {
    const tenantId = this.tenantId;

    const test = await this.prisma.labTestDefinition.findFirst({
      where: {
        id: testId,
        tenantId,
      },
    });

    if (!test) {
      throw new NotFoundException('LAB test not found');
    }

    const displayOrder =
      dto.displayOrder ??
      (await this.getNextParameterDisplayOrder(tenantId, test.id));

    await this.ensureParameterIdentityUnique({
      tenantId,
      testId: test.id,
      name: dto.name,
      unit: dto.unit,
    });

    try {
      return await this.prisma.labTestParameter.create({
        data: {
          tenantId,
          testId: test.id,
          name: dto.name.trim(),
          unit: dto.unit?.trim() || null,
          refLow: dto.refLow ?? null,
          refHigh: dto.refHigh ?? null,
          refText: dto.refText?.trim() || null,
          displayOrder,
          active: dto.active ?? true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new DomainException(
          'LAB_PARAMETER_CONFLICT',
          'A parameter with this name already exists for this test',
        );
      }
      throw error;
    }
  }

  async listParameters(testId: string) {
    const tenantId = this.tenantId;
    await this.getTestById(testId);

    const where = {
      tenantId,
      testId,
    };

    const [data, total] = await Promise.all([
      this.prisma.labTestParameter.findMany({
        where,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.labTestParameter.count({ where }),
    ]);

    return { data, total };
  }

  private async getNextParameterDisplayOrder(
    tenantId: string,
    testId: string,
  ): Promise<number> {
    const current = await this.prisma.labTestParameter.findFirst({
      where: {
        tenantId,
        testId,
      },
      orderBy: {
        displayOrder: 'desc',
      },
      select: {
        displayOrder: true,
      },
    });

    return (current?.displayOrder ?? -1) + 1;
  }

  private async ensureParameterIdentityUnique(input: {
    tenantId: string;
    testId: string;
    name: string;
    unit?: string;
  }): Promise<void> {
    const normalizedName = normalizeCatalogText(input.name);
    const normalizedUnit = normalizeCatalogText(input.unit);

    const existing = await this.prisma.labTestParameter.findMany({
      where: {
        tenantId: input.tenantId,
        testId: input.testId,
      },
      select: {
        id: true,
        name: true,
        unit: true,
      },
    });

    const conflict = existing.find(
      (parameter) =>
        normalizeCatalogText(parameter.name) === normalizedName &&
        normalizeCatalogText(parameter.unit) === normalizedUnit,
    );
    if (conflict) {
      throw new DomainException(
        'LAB_PARAMETER_CONFLICT',
        'A parameter with this name and unit already exists for this test',
        {
          conflicting_parameter_id: conflict.id,
        },
      );
    }
  }
}
