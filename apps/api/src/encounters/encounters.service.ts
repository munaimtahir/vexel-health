import {
  BbUrgency,
  type BbEncounterPrep,
  type IpdEncounterPrep,
  type LabEncounterPrep,
  type OpdEncounterPrep,
  Prisma,
  type RadEncounterPrep,
  type Encounter,
} from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DomainException } from '../common/errors/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import {
  type BbPrepSaveRequest,
  type EncounterPrepResponse,
  type EncounterPrepSaveRequest,
  type EncounterType,
  type IpdPrepSaveRequest,
  type LabPrepSaveRequest,
  type OpdPrepSaveRequest,
  type RadPrepSaveRequest,
} from './encounter-prep.types';
import { CreateEncounterDto } from './dto/create-encounter.dto';

const encounterStates = {
  CREATED: 'CREATED',
  PREP: 'PREP',
  IN_PROGRESS: 'IN_PROGRESS',
  FINALIZED: 'FINALIZED',
  DOCUMENTED: 'DOCUMENTED',
} as const;

type EncounterState = (typeof encounterStates)[keyof typeof encounterStates];

const encounterTypes: EncounterType[] = ['LAB', 'RAD', 'OPD', 'BB', 'IPD'];

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
    const encounter = await this.findEncounterById(id);
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

  async savePrep(
    id: string,
    payload: EncounterPrepSaveRequest,
  ): Promise<EncounterPrepResponse> {
    const tenantId = this.tenantId;
    const encounter = await this.findEncounterById(id);
    const prepPayload = this.ensureObjectPayload(payload);

    if (encounter.type === 'LAB') {
      const input = this.toLabPrepInput(prepPayload);
      const prep = await this.prisma.labEncounterPrep.upsert({
        where: {
          tenantId_encounterId: {
            tenantId,
            encounterId: encounter.id,
          },
        },
        create: {
          tenantId,
          encounterId: encounter.id,
          ...input,
        },
        update: {
          ...input,
        },
      });
      return this.toPrepResponse(encounter, prep);
    }

    if (encounter.type === 'RAD') {
      const input = this.toRadPrepInput(prepPayload);
      const prep = await this.prisma.radEncounterPrep.upsert({
        where: {
          tenantId_encounterId: {
            tenantId,
            encounterId: encounter.id,
          },
        },
        create: {
          tenantId,
          encounterId: encounter.id,
          ...input,
        },
        update: {
          ...input,
        },
      });
      return this.toPrepResponse(encounter, prep);
    }

    if (encounter.type === 'OPD') {
      const input = this.toOpdPrepInput(prepPayload);
      const prep = await this.prisma.opdEncounterPrep.upsert({
        where: {
          tenantId_encounterId: {
            tenantId,
            encounterId: encounter.id,
          },
        },
        create: {
          tenantId,
          encounterId: encounter.id,
          ...input,
        },
        update: {
          ...input,
        },
      });
      return this.toPrepResponse(encounter, prep);
    }

    if (encounter.type === 'BB') {
      const input = this.toBbPrepInput(prepPayload);
      const prep = await this.prisma.bbEncounterPrep.upsert({
        where: {
          tenantId_encounterId: {
            tenantId,
            encounterId: encounter.id,
          },
        },
        create: {
          tenantId,
          encounterId: encounter.id,
          ...input,
        },
        update: {
          ...input,
        },
      });
      return this.toPrepResponse(encounter, prep);
    }

    const input = this.toIpdPrepInput(prepPayload);
    const prep = await this.prisma.ipdEncounterPrep.upsert({
      where: {
        tenantId_encounterId: {
          tenantId,
          encounterId: encounter.id,
        },
      },
      create: {
        tenantId,
        encounterId: encounter.id,
        ...input,
      },
      update: {
        ...input,
      },
    });
    return this.toPrepResponse(encounter, prep);
  }

  async getPrep(id: string): Promise<EncounterPrepResponse> {
    const encounter = await this.findEncounterById(id);

    if (encounter.type === 'LAB') {
      const prep = await this.prisma.labEncounterPrep.findFirst({
        where: {
          tenantId: this.tenantId,
          encounterId: encounter.id,
        },
      });
      return this.toPrepResponse(encounter, prep);
    }

    if (encounter.type === 'RAD') {
      const prep = await this.prisma.radEncounterPrep.findFirst({
        where: {
          tenantId: this.tenantId,
          encounterId: encounter.id,
        },
      });
      return this.toPrepResponse(encounter, prep);
    }

    if (encounter.type === 'OPD') {
      const prep = await this.prisma.opdEncounterPrep.findFirst({
        where: {
          tenantId: this.tenantId,
          encounterId: encounter.id,
        },
      });
      return this.toPrepResponse(encounter, prep);
    }

    if (encounter.type === 'BB') {
      const prep = await this.prisma.bbEncounterPrep.findFirst({
        where: {
          tenantId: this.tenantId,
          encounterId: encounter.id,
        },
      });
      return this.toPrepResponse(encounter, prep);
    }

    const prep = await this.prisma.ipdEncounterPrep.findFirst({
      where: {
        tenantId: this.tenantId,
        encounterId: encounter.id,
      },
    });
    return this.toPrepResponse(encounter, prep);
  }

  async startMain(id: string) {
    const tenantId = this.tenantId;

    return this.prisma.$transaction(async (tx) => {
      const encounter = await tx.encounter.findFirst({
        where: {
          id,
          tenantId,
        },
      });

      if (!encounter) {
        throw new NotFoundException('Encounter not found');
      }

      if (encounter.status !== encounterStates.PREP) {
        throw new DomainException(
          'ENCOUNTER_STATE_INVALID',
          'Cannot start main phase before preparation',
        );
      }

      if (encounter.type === 'LAB') {
        const prep = await tx.labEncounterPrep.findFirst({
          where: {
            tenantId,
            encounterId: encounter.id,
          },
        });

        if (!prep?.specimenType || prep.specimenType.trim().length === 0) {
          throw new DomainException(
            'PREP_INCOMPLETE',
            'LAB prep requires specimenType before starting main',
          );
        }
      }

      return tx.encounter.update({
        where: {
          id: encounter.id,
        },
        data: {
          status: encounterStates.IN_PROGRESS,
        },
      });
    });
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

  private async findEncounterById(id: string): Promise<Encounter> {
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

  private ensureObjectPayload(payload: unknown): Record<string, unknown> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('Prep payload must be an object');
    }

    return payload as Record<string, unknown>;
  }

  private assertOnlyAllowedKeys(
    payload: Record<string, unknown>,
    allowedKeys: string[],
    encounterType: EncounterType,
  ): void {
    const allowed = new Set(allowedKeys);
    const invalidKeys = Object.keys(payload).filter((key) => !allowed.has(key));

    if (invalidKeys.length > 0) {
      throw new DomainException(
        'INVALID_ENCOUNTER_TYPE',
        `${encounterType} prep does not accept fields: ${invalidKeys.join(', ')}`,
      );
    }
  }

  private toLabPrepInput(
    payload: Record<string, unknown>,
  ): {
    specimenType?: string | null;
    collectedAt?: Date | null;
    collectorName?: string | null;
    receivedAt?: Date | null;
  } {
    this.assertOnlyAllowedKeys(
      payload,
      ['specimenType', 'collectedAt', 'collectorName', 'receivedAt'],
      'LAB',
    );

    return {
      specimenType: this.readNullableString(payload, 'specimenType'),
      collectedAt: this.readNullableDate(payload, 'collectedAt'),
      collectorName: this.readNullableString(payload, 'collectorName'),
      receivedAt: this.readNullableDate(payload, 'receivedAt'),
    };
  }

  private toRadPrepInput(
    payload: Record<string, unknown>,
  ): {
    fastingRequired?: boolean | null;
    fastingConfirmed?: boolean | null;
    contrastPlanned?: boolean | null;
    creatinineChecked?: boolean | null;
    pregnancyScreenDone?: boolean | null;
    notes?: string | null;
  } {
    this.assertOnlyAllowedKeys(
      payload,
      [
        'fastingRequired',
        'fastingConfirmed',
        'contrastPlanned',
        'creatinineChecked',
        'pregnancyScreenDone',
        'notes',
      ],
      'RAD',
    );

    return {
      fastingRequired: this.readNullableBoolean(payload, 'fastingRequired'),
      fastingConfirmed: this.readNullableBoolean(payload, 'fastingConfirmed'),
      contrastPlanned: this.readNullableBoolean(payload, 'contrastPlanned'),
      creatinineChecked: this.readNullableBoolean(payload, 'creatinineChecked'),
      pregnancyScreenDone: this.readNullableBoolean(payload, 'pregnancyScreenDone'),
      notes: this.readNullableString(payload, 'notes'),
    };
  }

  private toOpdPrepInput(
    payload: Record<string, unknown>,
  ): {
    systolicBp?: number | null;
    diastolicBp?: number | null;
    pulse?: number | null;
    temperatureC?: number | null;
    respiratoryRate?: number | null;
    weightKg?: number | null;
    spo2?: number | null;
    triageNotes?: string | null;
  } {
    this.assertOnlyAllowedKeys(
      payload,
      [
        'systolicBp',
        'diastolicBp',
        'pulse',
        'temperatureC',
        'respiratoryRate',
        'weightKg',
        'spo2',
        'triageNotes',
      ],
      'OPD',
    );

    return {
      systolicBp: this.readNullableInteger(payload, 'systolicBp'),
      diastolicBp: this.readNullableInteger(payload, 'diastolicBp'),
      pulse: this.readNullableInteger(payload, 'pulse'),
      temperatureC: this.readNullableNumber(payload, 'temperatureC'),
      respiratoryRate: this.readNullableInteger(payload, 'respiratoryRate'),
      weightKg: this.readNullableNumber(payload, 'weightKg'),
      spo2: this.readNullableInteger(payload, 'spo2'),
      triageNotes: this.readNullableString(payload, 'triageNotes'),
    };
  }

  private toBbPrepInput(
    payload: Record<string, unknown>,
  ): {
    sampleReceivedAt?: Date | null;
    aboGroup?: string | null;
    rhType?: string | null;
    componentRequested?: string | null;
    unitsRequested?: number | null;
    urgency?: BbUrgency | null;
  } {
    this.assertOnlyAllowedKeys(
      payload,
      [
        'sampleReceivedAt',
        'aboGroup',
        'rhType',
        'componentRequested',
        'unitsRequested',
        'urgency',
      ],
      'BB',
    );

    return {
      sampleReceivedAt: this.readNullableDate(payload, 'sampleReceivedAt'),
      aboGroup: this.readNullableString(payload, 'aboGroup'),
      rhType: this.readNullableString(payload, 'rhType'),
      componentRequested: this.readNullableString(payload, 'componentRequested'),
      unitsRequested: this.readNullableInteger(payload, 'unitsRequested'),
      urgency: this.readNullableBbUrgency(payload, 'urgency'),
    };
  }

  private toIpdPrepInput(
    payload: Record<string, unknown>,
  ): {
    admissionReason?: string | null;
    ward?: string | null;
    bed?: string | null;
    admittingNotes?: string | null;
  } {
    this.assertOnlyAllowedKeys(
      payload,
      ['admissionReason', 'ward', 'bed', 'admittingNotes'],
      'IPD',
    );

    return {
      admissionReason: this.readNullableString(payload, 'admissionReason'),
      ward: this.readNullableString(payload, 'ward'),
      bed: this.readNullableString(payload, 'bed'),
      admittingNotes: this.readNullableString(payload, 'admittingNotes'),
    };
  }

  private readNullableString(
    payload: Record<string, unknown>,
    key: string,
  ): string | null | undefined {
    if (!(key in payload)) {
      return undefined;
    }

    const value = payload[key];
    if (value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${key} must be a string or null`);
    }

    return value;
  }

  private readNullableBoolean(
    payload: Record<string, unknown>,
    key: string,
  ): boolean | null | undefined {
    if (!(key in payload)) {
      return undefined;
    }

    const value = payload[key];
    if (value === null) {
      return null;
    }

    if (typeof value !== 'boolean') {
      throw new BadRequestException(`${key} must be a boolean or null`);
    }

    return value;
  }

  private readNullableNumber(
    payload: Record<string, unknown>,
    key: string,
  ): number | null | undefined {
    if (!(key in payload)) {
      return undefined;
    }

    const value = payload[key];
    if (value === null) {
      return null;
    }

    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new BadRequestException(`${key} must be a number or null`);
    }

    return value;
  }

  private readNullableInteger(
    payload: Record<string, unknown>,
    key: string,
  ): number | null | undefined {
    const value = this.readNullableNumber(payload, key);
    if (value === undefined || value === null) {
      return value;
    }

    if (!Number.isInteger(value)) {
      throw new BadRequestException(`${key} must be an integer or null`);
    }

    return value;
  }

  private readNullableDate(
    payload: Record<string, unknown>,
    key: string,
  ): Date | null | undefined {
    if (!(key in payload)) {
      return undefined;
    }

    const value = payload[key];
    if (value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${key} must be an ISO date-time string or null`);
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${key} must be a valid ISO date-time string`);
    }

    return date;
  }

  private readNullableBbUrgency(
    payload: Record<string, unknown>,
    key: string,
  ): BbUrgency | null | undefined {
    if (!(key in payload)) {
      return undefined;
    }

    const value = payload[key];
    if (value === null) {
      return null;
    }

    if (value === 'ROUTINE' || value === 'URGENT') {
      return value;
    }

    throw new BadRequestException(`${key} must be ROUTINE, URGENT, or null`);
  }

  private toPrepResponse(
    encounter: Encounter,
    prep:
      | LabEncounterPrep
      | RadEncounterPrep
      | OpdEncounterPrep
      | BbEncounterPrep
      | IpdEncounterPrep
      | null,
  ): EncounterPrepResponse {
    const type = this.toEncounterType(encounter.type);
    const response: EncounterPrepResponse = {
      encounterId: encounter.id,
      type,
      updatedAt: prep ? prep.updatedAt.toISOString() : null,
      labPrep: null,
      radPrep: null,
      opdPrep: null,
      bbPrep: null,
      ipdPrep: null,
    };

    if (!prep) {
      return response;
    }

    if (type === 'LAB') {
      const item = prep as LabEncounterPrep;
      response.labPrep = {
        specimenType: item.specimenType,
        collectedAt: item.collectedAt ? item.collectedAt.toISOString() : null,
        collectorName: item.collectorName,
        receivedAt: item.receivedAt ? item.receivedAt.toISOString() : null,
      };
      return response;
    }

    if (type === 'RAD') {
      const item = prep as RadEncounterPrep;
      response.radPrep = {
        fastingRequired: item.fastingRequired,
        fastingConfirmed: item.fastingConfirmed,
        contrastPlanned: item.contrastPlanned,
        creatinineChecked: item.creatinineChecked,
        pregnancyScreenDone: item.pregnancyScreenDone,
        notes: item.notes,
      };
      return response;
    }

    if (type === 'OPD') {
      const item = prep as OpdEncounterPrep;
      response.opdPrep = {
        systolicBp: item.systolicBp,
        diastolicBp: item.diastolicBp,
        pulse: item.pulse,
        temperatureC: item.temperatureC,
        respiratoryRate: item.respiratoryRate,
        weightKg: item.weightKg,
        spo2: item.spo2,
        triageNotes: item.triageNotes,
      };
      return response;
    }

    if (type === 'BB') {
      const item = prep as BbEncounterPrep;
      response.bbPrep = {
        sampleReceivedAt: item.sampleReceivedAt
          ? item.sampleReceivedAt.toISOString()
          : null,
        aboGroup: item.aboGroup,
        rhType: item.rhType,
        componentRequested: item.componentRequested,
        unitsRequested: item.unitsRequested,
        urgency: item.urgency,
      };
      return response;
    }

    const item = prep as IpdEncounterPrep;
    response.ipdPrep = {
      admissionReason: item.admissionReason,
      ward: item.ward,
      bed: item.bed,
      admittingNotes: item.admittingNotes,
    };

    return response;
  }

  private toEncounterType(type: string): EncounterType {
    if (encounterTypes.includes(type as EncounterType)) {
      return type as EncounterType;
    }

    throw new DomainException('INVALID_ENCOUNTER_TYPE', `Unsupported encounter type: ${type}`);
  }
}
