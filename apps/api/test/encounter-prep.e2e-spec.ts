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

type PatientRecord = {
  id: string;
  tenantId: string;
  regNo: string;
  name: string;
  dob: Date | null;
  gender: string | null;
  phone: string | null;
  mrn: string | null;
  createdAt: Date;
};

type EncounterRecord = {
  id: string;
  tenantId: string;
  patientId: string;
  encounterCode: string;
  type: string;
  status: string;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
};

type LabPrepRecord = {
  id: string;
  tenantId: string;
  encounterId: string;
  specimenType: string | null;
  collectedAt: Date | null;
  collectorName: string | null;
  receivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function createPrismaMock() {
  const makeId = (prefix: number): string =>
    `00000000-0000-4000-8000-${String(prefix).padStart(12, '0')}`;

  const patients: PatientRecord[] = [];
  const encounters: EncounterRecord[] = [];
  const labPreps: LabPrepRecord[] = [];

  const patientCounters = new Map<string, number>();
  const encounterCounters = new Map<string, number>();
  const tenantDomains = new Map<string, string>([
    ['tenant-a.test', 'tenant-a'],
    ['tenant-b.test', 'tenant-b'],
  ]);

  const prismaMock: any = {
    tenantDomain: {
      findUnique: jest.fn(async ({ where }: { where: { domain: string } }) => {
        const tenantId = tenantDomains.get(where.domain);
        return tenantId ? { tenantId } : null;
      }),
    },
    patientSequence: {
      upsert: jest.fn(async ({ where }: { where: { tenantId: string } }) => {
        const currentValue = patientCounters.get(where.tenantId) ?? 0;
        const nextValue = currentValue + 1;
        patientCounters.set(where.tenantId, nextValue);
        return {
          tenantId: where.tenantId,
          lastValue: nextValue,
          updatedAt: new Date(),
        };
      }),
    },
    encounterSequence: {
      upsert: jest.fn(
        async ({
          where,
        }: {
          where: {
            tenantId_type_year: {
              tenantId: string;
              type: string;
              year: number;
            };
          };
        }) => {
          const key = `${where.tenantId_type_year.tenantId}:${where.tenantId_type_year.type}:${where.tenantId_type_year.year}`;
          const current = encounterCounters.get(key) ?? 0;
          const next = current + 1;
          encounterCounters.set(key, next);
          return {
            tenantId: where.tenantId_type_year.tenantId,
            type: where.tenantId_type_year.type,
            year: where.tenantId_type_year.year,
            lastValue: next,
            updatedAt: new Date(),
          };
        },
      ),
    },
    patient: {
      create: jest.fn(
        async ({
          data,
        }: {
          data: {
            tenantId: string;
            regNo: string;
            name: string;
            dob?: Date;
            gender?: string;
            phone?: string;
          };
        }) => {
          const record: PatientRecord = {
            id: makeId(1000 + patients.length + 1),
            tenantId: data.tenantId,
            regNo: data.regNo,
            name: data.name,
            dob: data.dob ?? null,
            gender: data.gender ?? null,
            phone: data.phone ?? null,
            mrn: null,
            createdAt: new Date(),
          };
          patients.push(record);
          return record;
        },
      ),
      findFirst: jest.fn(
        async ({ where }: { where: { id: string; tenantId: string } }) => {
          return (
            patients.find(
              (patient) =>
                patient.id === where.id && patient.tenantId === where.tenantId,
            ) ?? null
          );
        },
      ),
      findMany: jest.fn(async ({ where }: { where: { tenantId: string } }) => {
        return patients.filter(
          (patient) => patient.tenantId === where.tenantId,
        );
      }),
      count: jest.fn(async ({ where }: { where: { tenantId: string } }) => {
        return patients.filter((patient) => patient.tenantId === where.tenantId)
          .length;
      }),
    },
    encounter: {
      create: jest.fn(
        async ({
          data,
        }: {
          data: {
            tenantId: string;
            patientId: string;
            encounterCode: string;
            type: string;
            status: string;
            startedAt: Date;
          };
        }) => {
          const record: EncounterRecord = {
            id: makeId(2000 + encounters.length + 1),
            tenantId: data.tenantId,
            patientId: data.patientId,
            encounterCode: data.encounterCode,
            type: data.type,
            status: data.status,
            startedAt: data.startedAt,
            endedAt: null,
            createdAt: new Date(),
          };
          encounters.push(record);
          return record;
        },
      ),
      findFirst: jest.fn(
        async ({
          where,
        }: {
          where: {
            id: string;
            tenantId: string;
          };
        }) => {
          return (
            encounters.find(
              (encounter) =>
                encounter.id === where.id &&
                encounter.tenantId === where.tenantId,
            ) ?? null
          );
        },
      ),
      findMany: jest.fn(async ({ where }: { where: { tenantId: string } }) => {
        return encounters.filter(
          (encounter) => encounter.tenantId === where.tenantId,
        );
      }),
      count: jest.fn(async ({ where }: { where: { tenantId: string } }) => {
        return encounters.filter(
          (encounter) => encounter.tenantId === where.tenantId,
        ).length;
      }),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { status?: string; endedAt?: Date };
        }) => {
          const encounter = encounters.find((item) => item.id === where.id);
          if (!encounter) {
            throw new Error('encounter not found');
          }

          if (data.status !== undefined) {
            encounter.status = data.status;
          }

          if (data.endedAt !== undefined) {
            encounter.endedAt = data.endedAt;
          }

          return encounter;
        },
      ),
    },
    labEncounterPrep: {
      upsert: jest.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: {
            tenantId_encounterId: {
              tenantId: string;
              encounterId: string;
            };
          };
          create: {
            tenantId: string;
            encounterId: string;
            specimenType?: string | null;
            collectedAt?: Date | null;
            collectorName?: string | null;
            receivedAt?: Date | null;
          };
          update: {
            specimenType?: string | null;
            collectedAt?: Date | null;
            collectorName?: string | null;
            receivedAt?: Date | null;
          };
        }) => {
          const existing = labPreps.find(
            (prep) =>
              prep.tenantId === where.tenantId_encounterId.tenantId &&
              prep.encounterId === where.tenantId_encounterId.encounterId,
          );

          if (existing) {
            if (update.specimenType !== undefined) {
              existing.specimenType = update.specimenType;
            }
            if (update.collectedAt !== undefined) {
              existing.collectedAt = update.collectedAt;
            }
            if (update.collectorName !== undefined) {
              existing.collectorName = update.collectorName;
            }
            if (update.receivedAt !== undefined) {
              existing.receivedAt = update.receivedAt;
            }
            existing.updatedAt = new Date();
            return existing;
          }

          const record: LabPrepRecord = {
            id: makeId(3000 + labPreps.length + 1),
            tenantId: create.tenantId,
            encounterId: create.encounterId,
            specimenType: create.specimenType ?? null,
            collectedAt: create.collectedAt ?? null,
            collectorName: create.collectorName ?? null,
            receivedAt: create.receivedAt ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          labPreps.push(record);
          return record;
        },
      ),
      findFirst: jest.fn(
        async ({
          where,
        }: {
          where: {
            tenantId: string;
            encounterId: string;
          };
        }) => {
          return (
            labPreps.find(
              (prep) =>
                prep.tenantId === where.tenantId &&
                prep.encounterId === where.encounterId,
            ) ?? null
          );
        },
      ),
      findMany: jest.fn(async ({ where }: any) => {
        const encounterIds: string[] | undefined = where.encounterId?.in;
        return labPreps.filter((prep) => {
          if (prep.tenantId !== where.tenantId) {
            return false;
          }
          if (
            Array.isArray(encounterIds) &&
            !encounterIds.includes(prep.encounterId)
          ) {
            return false;
          }
          return true;
        });
      }),
    },
    radEncounterPrep: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    opdEncounterPrep: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    bbEncounterPrep: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    ipdEncounterPrep: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(async (operation: (tx: any) => Promise<unknown>) =>
      operation(prismaMock),
    ),
  };

  return prismaMock;
}

describe('Encounter prep flow (e2e)', () => {
  let app: INestApplication;
  let labEncounterId: string;

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

  it('saves and reads LAB prep, then allows start-main', async () => {
    const patientResponse = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', 'tenant-a.test')
      .send({
        name: 'Prep Test Patient',
      })
      .expect(201);

    const encounterResponse = await request(app.getHttpServer())
      .post('/encounters')
      .set('Host', 'tenant-a.test')
      .send({
        patientId: patientResponse.body.id,
        type: 'LAB',
      })
      .expect(201);

    labEncounterId = encounterResponse.body.id;

    await request(app.getHttpServer())
      .post(`/encounters/${labEncounterId}:start-prep`)
      .set('Host', 'tenant-a.test')
      .expect(200);

    const savePrepResponse = await request(app.getHttpServer())
      .post(`/encounters/${labEncounterId}:save-prep`)
      .set('Host', 'tenant-a.test')
      .send({
        specimenType: 'Blood',
      })
      .expect(200);

    expect(savePrepResponse.body.type).toBe('LAB');
    expect(savePrepResponse.body.labPrep?.specimenType).toBe('Blood');

    await request(app.getHttpServer())
      .get(`/encounters/${labEncounterId}/prep`)
      .set('Host', 'tenant-a.test')
      .expect(200)
      .expect((response) => {
        expect(response.body.type).toBe('LAB');
        expect(response.body.labPrep?.specimenType).toBe('Blood');
      });

    await request(app.getHttpServer())
      .post(`/encounters/${labEncounterId}:start-main`)
      .set('Host', 'tenant-a.test')
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe('IN_PROGRESS');
      });
  });

  it('prevents tenant B from reading tenant A prep', async () => {
    await request(app.getHttpServer())
      .get(`/encounters/${labEncounterId}/prep`)
      .set('Host', 'tenant-b.test')
      .expect(404)
      .expect((response) => {
        expect(response.body.error.type).toBe('not_found');
      });
  });

  it('rejects payload shape that does not match encounter type', async () => {
    const patientResponse = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', 'tenant-a.test')
      .send({
        name: 'Type Check Patient',
      })
      .expect(201);

    const encounterResponse = await request(app.getHttpServer())
      .post('/encounters')
      .set('Host', 'tenant-a.test')
      .send({
        patientId: patientResponse.body.id,
        type: 'LAB',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/encounters/${encounterResponse.body.id}:start-prep`)
      .set('Host', 'tenant-a.test')
      .expect(200);

    await request(app.getHttpServer())
      .post(`/encounters/${encounterResponse.body.id}:save-prep`)
      .set('Host', 'tenant-a.test')
      .send({
        triageNotes: 'This is OPD-only',
      })
      .expect(409)
      .expect((response) => {
        expect(response.body.error.type).toBe('domain_error');
        expect(response.body.error.code).toBe('INVALID_ENCOUNTER_TYPE');
      });
  });
});
