import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { DomainException } from '../common/errors/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEncounterDto } from './dto/create-encounter.dto';

const encounterStates = {
  CREATED: 'CREATED',
  PREP: 'PREP',
  IN_PROGRESS: 'IN_PROGRESS',
  FINALIZED: 'FINALIZED',
  DOCUMENTED: 'DOCUMENTED',
} as const;

type EncounterState = (typeof encounterStates)[keyof typeof encounterStates];

@Injectable()
export class EncountersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get tenantId(): string {
    const tenantId = this.cls.get<string>('TENANT_ID');
    if (typeof tenantId !== 'string' || tenantId.length === 0) {
      throw new UnauthorizedException('Tenant context missing');
    }
    return tenantId;
  }

  async create(dto: CreateEncounterDto) {
    const tenantId = this.tenantId;
    const encounterType = dto.type.trim().toUpperCase();
    const startedAt = dto.startedAt ? new Date(dto.startedAt) : new Date();
    const year = startedAt.getUTCFullYear();

    return this.prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findFirst({
        where: {
          id: dto.patientId,
          tenantId,
        },
      });

      if (!patient) {
        throw new DomainException(
          'PATIENT_NOT_FOUND',
          'Patient is not available in this tenant',
        );
      }

      const sequence = await tx.encounterSequence.upsert({
        where: {
          tenantId_type_year: {
            tenantId,
            type: encounterType,
            year,
          },
        },
        create: {
          tenantId,
          type: encounterType,
          year,
          lastValue: 1,
        },
        update: {
          lastValue: {
            increment: 1,
          },
        },
      });

      const encounterCode = `${encounterType}-${year}-${String(sequence.lastValue).padStart(6, '0')}`;

      return tx.encounter.create({
        data: {
          tenantId,
          patientId: dto.patientId,
          type: encounterType,
          encounterCode,
          status: encounterStates.CREATED,
          startedAt,
        },
      });
    });
  }

  async findAll(
    page: number,
    query?: {
      patientId?: string;
      type?: string;
      status?: string;
    },
  ) {
    const take = 20;
    const skip = (page - 1) * take;
    const where: Prisma.EncounterWhereInput = {
      tenantId: this.tenantId,
    };

    if (query?.patientId) {
      where.patientId = query.patientId;
    }
    if (query?.type) {
      where.type = query.type.trim().toUpperCase();
    }
    if (query?.status) {
      where.status = query.status.trim().toUpperCase();
    }

    const [data, total] = await Promise.all([
      this.prisma.encounter.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.encounter.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: {
        id,
        tenantId: this.tenantId,
      },
    });

    if (!encounter) {
      throw new NotFoundException('Encounter not found');
    }

    return encounter;
  }

  async startPrep(id: string) {
    return this.transitionState(
      id,
      encounterStates.CREATED,
      encounterStates.PREP,
      'Cannot start preparation before encounter registration',
    );
  }

  async startMain(id: string) {
    return this.transitionState(
      id,
      encounterStates.PREP,
      encounterStates.IN_PROGRESS,
      'Cannot start main phase before preparation',
    );
  }

  async finalize(id: string) {
    return this.transitionState(
      id,
      encounterStates.IN_PROGRESS,
      encounterStates.FINALIZED,
      'Cannot finalize before main phase starts',
      true,
    );
  }

  private async transitionState(
    encounterId: string,
    expectedCurrentState: EncounterState,
    nextState: EncounterState,
    errorMessage: string,
    markEndedAt = false,
  ) {
    const tenantId = this.tenantId;
    return this.prisma.$transaction(async (tx) => {
      const encounter = await tx.encounter.findFirst({
        where: {
          id: encounterId,
          tenantId,
        },
      });

      if (!encounter) {
        throw new NotFoundException('Encounter not found');
      }

      if (encounter.status !== expectedCurrentState) {
        throw new DomainException('ENCOUNTER_STATE_INVALID', errorMessage);
      }

      return tx.encounter.update({
        where: { id: encounter.id },
        data: {
          status: nextState,
          endedAt: markEndedAt ? new Date() : undefined,
        },
      });
    });
  }
}
