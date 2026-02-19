import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'node:crypto';
import { ValidationError } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/errors/global-exception.filter';
import { toValidationFieldMap } from '../src/common/errors/validation-errors';
import {
  DOCUMENT_RENDER_QUEUE,
  type DocumentRenderQueue,
  type DocumentRenderJobPayload,
} from '../src/documents/document-render.queue';
import {
  DOCUMENT_STORAGE_ADAPTER,
  type DocumentStorageAdapter,
} from '../src/documents/document-storage.adapter';
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

type DocumentRecord = {
  id: string;
  tenantId: string;
  encounterId: string;
  documentType: 'ENCOUNTER_SUMMARY';
  status: 'QUEUED' | 'RENDERED' | 'FAILED';
  payloadVersion: number;
  templateVersion: number;
  payloadJson: Record<string, unknown>;
  payloadHash: string;
  storageBackend: 'LOCAL' | 'S3';
  storageKey: string | null;
  pdfHash: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  renderedAt: Date | null;
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

type RadMainRecord = {
  id: string;
  tenantId: string;
  encounterId: string;
  reportText: string | null;
  impression: string | null;
  radiologistName: string | null;
  reportedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MemoryState = {
  patients: PatientRecord[];
  encounters: EncounterRecord[];
  documents: DocumentRecord[];
  labPreps: LabPrepRecord[];
  radMains: RadMainRecord[];
  patientCounters: Map<string, number>;
  encounterCounters: Map<string, number>;
  tenantDomains: Map<string, string>;
  files: Map<string, Buffer>;
};

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const normalized: Record<string, unknown> = {};

    for (const key of sortedKeys) {
      normalized[key] = normalizeValue(record[key]);
    }

    return normalized;
  }

  return value;
}

function canonicalizeJson(value: unknown): string {
  return JSON.stringify(normalizeValue(value));
}

function sha256Hex(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

class InMemoryStorageAdapter implements DocumentStorageAdapter {
  constructor(private readonly files: Map<string, Buffer>) {}

  async putPdf(input: {
    tenantId: string;
    documentId: string;
    bytes: Buffer;
  }): Promise<{ storageKey: string }> {
    const storageKey = `${input.tenantId}/${input.documentId}.pdf`;
    this.files.set(storageKey, input.bytes);
    return { storageKey };
  }

  async getPdf(input: { tenantId: string; storageKey: string }): Promise<Buffer> {
    if (!input.storageKey.startsWith(`${input.tenantId}/`)) {
      throw new Error('storage key does not belong to tenant');
    }

    const bytes = this.files.get(input.storageKey);
    if (!bytes) {
      throw new Error('file not found');
    }

    return bytes;
  }
}

function findPatientById(state: MemoryState, id: string): PatientRecord | undefined {
  return state.patients.find((patient) => patient.id === id);
}

function createPrismaMock(state: MemoryState) {
  const makeId = (prefix: number): string =>
    `00000000-0000-4000-8000-${String(prefix).padStart(12, '0')}`;

  const prismaMock: Record<string, unknown> = {
    tenantDomain: {
      findUnique: jest.fn(async ({ where }: { where: { domain: string } }) => {
        const tenantId = state.tenantDomains.get(where.domain);
        return tenantId ? { tenantId } : null;
      }),
    },
    patientSequence: {
      upsert: jest.fn(async ({ where }: { where: { tenantId: string } }) => {
        const current = state.patientCounters.get(where.tenantId) ?? 0;
        const next = current + 1;
        state.patientCounters.set(where.tenantId, next);
        return {
          tenantId: where.tenantId,
          lastValue: next,
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
          const current = state.encounterCounters.get(key) ?? 0;
          const next = current + 1;
          state.encounterCounters.set(key, next);
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
            id: makeId(state.patients.length + 1),
            tenantId: data.tenantId,
            regNo: data.regNo,
            name: data.name,
            dob: data.dob ?? null,
            gender: data.gender ?? null,
            phone: data.phone ?? null,
            mrn: null,
            createdAt: new Date(),
          };

          state.patients.push(record);
          return record;
        },
      ),
      findMany: jest.fn(
        async ({
          where,
          skip = 0,
          take = 20,
        }: {
          where: { tenantId: string; OR?: Array<{ name?: { contains: string } } | { regNo?: { contains: string } }> };
          skip?: number;
          take?: number;
        }) => {
          const query = where.OR?.[0] && 'name' in where.OR[0]
            ? where.OR[0].name?.contains?.toLowerCase() ?? ''
            : where.OR?.[1] && 'regNo' in where.OR[1]
              ? where.OR[1].regNo?.contains?.toLowerCase() ?? ''
              : '';

          const scoped = state.patients
            .filter((patient) => patient.tenantId === where.tenantId)
            .filter((patient) => {
              if (!query) {
                return true;
              }

              return (
                patient.name.toLowerCase().includes(query) ||
                patient.regNo.toLowerCase().includes(query)
              );
            })
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

          return scoped.slice(skip, skip + take);
        },
      ),
      count: jest.fn(
        async ({
          where,
        }: {
          where: { tenantId: string; OR?: Array<{ name?: { contains: string } } | { regNo?: { contains: string } }> };
        }) => {
          const query = where.OR?.[0] && 'name' in where.OR[0]
            ? where.OR[0].name?.contains?.toLowerCase() ?? ''
            : where.OR?.[1] && 'regNo' in where.OR[1]
              ? where.OR[1].regNo?.contains?.toLowerCase() ?? ''
              : '';

          return state.patients
            .filter((patient) => patient.tenantId === where.tenantId)
            .filter((patient) => {
              if (!query) {
                return true;
              }

              return (
                patient.name.toLowerCase().includes(query) ||
                patient.regNo.toLowerCase().includes(query)
              );
            }).length;
        },
      ),
      findFirst: jest.fn(
        async ({ where }: { where: { id: string; tenantId: string } }) => {
          return (
            state.patients.find(
              (patient) =>
                patient.id === where.id && patient.tenantId === where.tenantId,
            ) ?? null
          );
        },
      ),
    },
    encounter: {
      create: jest.fn(
        async ({
          data,
        }: {
          data: {
            tenantId: string;
            patientId: string;
            type: string;
            encounterCode: string;
            status: string;
            startedAt: Date;
          };
        }) => {
          const record: EncounterRecord = {
            id: makeId(1000 + state.encounters.length + 1),
            tenantId: data.tenantId,
            patientId: data.patientId,
            encounterCode: data.encounterCode,
            type: data.type,
            status: data.status,
            startedAt: data.startedAt,
            endedAt: null,
            createdAt: new Date(),
          };

          state.encounters.push(record);
          return record;
        },
      ),
      findMany: jest.fn(
        async ({
          where,
          skip = 0,
          take = 20,
        }: {
          where: {
            tenantId: string;
            patientId?: string;
            type?: string;
            status?: string;
          };
          skip?: number;
          take?: number;
        }) => {
          const scoped = state.encounters
            .filter((encounter) => encounter.tenantId === where.tenantId)
            .filter((encounter) =>
              where.patientId ? encounter.patientId === where.patientId : true,
            )
            .filter((encounter) => (where.type ? encounter.type === where.type : true))
            .filter((encounter) =>
              where.status ? encounter.status === where.status : true,
            )
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

          return scoped.slice(skip, skip + take);
        },
      ),
      count: jest.fn(
        async ({
          where,
        }: {
          where: {
            tenantId: string;
            patientId?: string;
            type?: string;
            status?: string;
          };
        }) => {
          return state.encounters
            .filter((encounter) => encounter.tenantId === where.tenantId)
            .filter((encounter) =>
              where.patientId ? encounter.patientId === where.patientId : true,
            )
            .filter((encounter) => (where.type ? encounter.type === where.type : true))
            .filter((encounter) =>
              where.status ? encounter.status === where.status : true,
            ).length;
        },
      ),
      findFirst: jest.fn(
        async ({
          where,
          include,
        }: {
          where: {
            id: string;
            tenantId: string;
          };
          include?: { patient?: boolean };
        }) => {
          const encounter = state.encounters.find(
            (item) => item.id === where.id && item.tenantId === where.tenantId,
          );

          if (!encounter) {
            return null;
          }

          if (include?.patient) {
            const patient = findPatientById(state, encounter.patientId);
            if (!patient) {
              return null;
            }

            return {
              ...encounter,
              patient,
            };
          }

          return encounter;
        },
      ),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: {
            status?: string;
            endedAt?: Date;
          };
        }) => {
          const encounter = state.encounters.find((item) => item.id === where.id);
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
    document: {
      findFirst: jest.fn(
        async ({
          where,
        }: {
          where: {
            id?: string;
            tenantId: string;
            encounterId?: string;
            documentType?: 'ENCOUNTER_SUMMARY';
            templateVersion?: number;
            payloadHash?: string;
            status?: 'QUEUED' | 'RENDERED' | 'FAILED';
          };
        }) => {
          return (
            state.documents.find((document) => {
              if (document.tenantId !== where.tenantId) {
                return false;
              }

              if (where.id && document.id !== where.id) {
                return false;
              }

              if (where.encounterId && document.encounterId !== where.encounterId) {
                return false;
              }

              if (where.documentType && document.documentType !== where.documentType) {
                return false;
              }

              if (
                where.templateVersion !== undefined &&
                document.templateVersion !== where.templateVersion
              ) {
                return false;
              }

              if (where.payloadHash && document.payloadHash !== where.payloadHash) {
                return false;
              }

              if (where.status && document.status !== where.status) {
                return false;
              }

              return true;
            }) ?? null
          );
        },
      ),
      create: jest.fn(
        async ({
          data,
        }: {
          data: {
            tenantId: string;
            encounterId: string;
            documentType: 'ENCOUNTER_SUMMARY';
            status: 'QUEUED' | 'RENDERED' | 'FAILED';
            payloadVersion: number;
            templateVersion: number;
            payloadJson: Record<string, unknown>;
            payloadHash: string;
            storageBackend: 'LOCAL' | 'S3';
          };
        }) => {
          const duplicate = state.documents.find(
            (document) =>
              document.tenantId === data.tenantId &&
              document.encounterId === data.encounterId &&
              document.documentType === data.documentType &&
              document.templateVersion === data.templateVersion &&
              document.payloadHash === data.payloadHash,
          );

          if (duplicate) {
            throw new Error('P2002 duplicate unique key');
          }

          const record: DocumentRecord = {
            id: makeId(2000 + state.documents.length + 1),
            tenantId: data.tenantId,
            encounterId: data.encounterId,
            documentType: data.documentType,
            status: data.status,
            payloadVersion: data.payloadVersion,
            templateVersion: data.templateVersion,
            payloadJson: data.payloadJson,
            payloadHash: data.payloadHash,
            storageBackend: data.storageBackend,
            storageKey: null,
            pdfHash: null,
            errorCode: null,
            errorMessage: null,
            createdAt: new Date(),
            renderedAt: null,
          };

          state.documents.push(record);
          return record;
        },
      ),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<DocumentRecord>;
        }) => {
          const document = state.documents.find((item) => item.id === where.id);
          if (!document) {
            throw new Error('document not found');
          }

          Object.assign(document, data);
          return document;
        },
      ),
      updateMany: jest.fn(
        async ({
          where,
          data,
        }: {
          where: {
            id: string;
            tenantId: string;
            status: 'QUEUED' | 'RENDERED' | 'FAILED';
          };
          data: Partial<DocumentRecord>;
        }) => {
          let count = 0;

          for (const document of state.documents) {
            if (
              document.id === where.id &&
              document.tenantId === where.tenantId &&
              document.status === where.status
            ) {
              Object.assign(document, data);
              count += 1;
            }
          }

          return { count };
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
          where: { tenantId_encounterId: { tenantId: string; encounterId: string } };
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
          const existing = state.labPreps.find(
            (item) =>
              item.tenantId === where.tenantId_encounterId.tenantId &&
              item.encounterId === where.tenantId_encounterId.encounterId,
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
            id: makeId(3000 + state.labPreps.length + 1),
            tenantId: create.tenantId,
            encounterId: create.encounterId,
            specimenType: create.specimenType ?? null,
            collectedAt: create.collectedAt ?? null,
            collectorName: create.collectorName ?? null,
            receivedAt: create.receivedAt ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          state.labPreps.push(record);
          return record;
        },
      ),
      findFirst: jest.fn(
        async ({
          where,
        }: {
          where: { tenantId: string; encounterId: string };
        }) => {
          return (
            state.labPreps.find(
              (item) =>
                item.tenantId === where.tenantId &&
                item.encounterId === where.encounterId,
            ) ?? null
          );
        },
      ),
    },
    radEncounterMain: {
      upsert: jest.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { tenantId_encounterId: { tenantId: string; encounterId: string } };
          create: {
            tenantId: string;
            encounterId: string;
            reportText?: string | null;
            impression?: string | null;
            radiologistName?: string | null;
            reportedAt?: Date | null;
          };
          update: {
            reportText?: string | null;
            impression?: string | null;
            radiologistName?: string | null;
            reportedAt?: Date | null;
          };
        }) => {
          const existing = state.radMains.find(
            (item) =>
              item.tenantId === where.tenantId_encounterId.tenantId &&
              item.encounterId === where.tenantId_encounterId.encounterId,
          );

          if (existing) {
            if (update.reportText !== undefined) {
              existing.reportText = update.reportText;
            }
            if (update.impression !== undefined) {
              existing.impression = update.impression;
            }
            if (update.radiologistName !== undefined) {
              existing.radiologistName = update.radiologistName;
            }
            if (update.reportedAt !== undefined) {
              existing.reportedAt = update.reportedAt;
            }
            existing.updatedAt = new Date();
            return existing;
          }

          const record: RadMainRecord = {
            id: makeId(4000 + state.radMains.length + 1),
            tenantId: create.tenantId,
            encounterId: create.encounterId,
            reportText: create.reportText ?? null,
            impression: create.impression ?? null,
            radiologistName: create.radiologistName ?? null,
            reportedAt: create.reportedAt ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          state.radMains.push(record);
          return record;
        },
      ),
      findFirst: jest.fn(
        async ({
          where,
        }: {
          where: { tenantId: string; encounterId: string };
        }) => {
          return (
            state.radMains.find(
              (item) =>
                item.tenantId === where.tenantId &&
                item.encounterId === where.encounterId,
            ) ?? null
          );
        },
      ),
    },
    $transaction: jest.fn(async (operation: (tx: Record<string, unknown>) => Promise<unknown>) =>
      operation(prismaMock),
    ),
  };

  return prismaMock;
}

function binaryParser(
  res: NodeJS.ReadableStream,
  callback: (error: Error | null, data?: Buffer) => void,
): void {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer | string) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });
  res.on('end', () => {
    callback(null, Buffer.concat(chunks));
  });
  res.on('error', (error: Error) => {
    callback(error);
  });
}

describe('Document pipeline (e2e)', () => {
  let app: INestApplication;
  let createdEncounterId: string;
  let createdDocumentId: string;
  let expectedPdfHash: string;

  const state: MemoryState = {
    patients: [],
    encounters: [],
    documents: [],
    labPreps: [],
    radMains: [],
    patientCounters: new Map<string, number>(),
    encounterCounters: new Map<string, number>(),
    tenantDomains: new Map<string, string>([
      ['tenant-a.test', 'tenant-a'],
      ['tenant-b.test', 'tenant-b'],
    ]),
    files: new Map<string, Buffer>(),
  };

  const prismaMock = createPrismaMock(state);
  const storageAdapter = new InMemoryStorageAdapter(state.files);

  const queueAdapter: DocumentRenderQueue = {
    enqueueDocumentRender: jest.fn(async (payload: DocumentRenderJobPayload) => {
      const document = state.documents.find(
        (item) =>
          item.id === payload.documentId &&
          item.tenantId === payload.tenantId &&
          item.status === 'QUEUED',
      );

      if (!document) {
        return;
      }

      const payloadMeta =
        typeof document.payloadJson === 'object' &&
        document.payloadJson !== null &&
        typeof (document.payloadJson as Record<string, unknown>).meta === 'object' &&
        (document.payloadJson as Record<string, unknown>).meta !== null
          ? ((document.payloadJson as Record<string, unknown>)
              .meta as Record<string, unknown>)
          : null;
      const templateKey =
        payloadMeta && typeof payloadMeta.templateKey === 'string'
          ? payloadMeta.templateKey
          : 'ENCOUNTER_SUMMARY_V1';

      const deterministicPdf = Buffer.from(
        `${templateKey}|t${document.templateVersion}|p${document.payloadVersion}|${canonicalizeJson(document.payloadJson)}`,
      );
      const { storageKey } = await storageAdapter.putPdf({
        tenantId: payload.tenantId,
        documentId: payload.documentId,
        bytes: deterministicPdf,
      });

      document.status = 'RENDERED';
      document.storageBackend = 'LOCAL';
      document.storageKey = storageKey;
      document.pdfHash = sha256Hex(deterministicPdf);
      document.renderedAt = new Date();
      document.errorCode = null;
      document.errorMessage = null;

      const encounter = state.encounters.find(
        (item) => item.id === document.encounterId && item.tenantId === payload.tenantId,
      );
      if (encounter && encounter.status === 'FINALIZED') {
        encounter.status = 'DOCUMENTED';
      }
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(DOCUMENT_STORAGE_ADAPTER)
      .useValue(storageAdapter)
      .overrideProvider(DOCUMENT_RENDER_QUEUE)
      .useValue(queueAdapter)
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
              fields: toValidationFieldMap(errors),
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

  it('generates deterministic encounter PDF and keeps :document idempotent', async () => {
    const patientResponse = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', 'tenant-a.test')
      .send({
        name: 'Alice Example',
      })
      .expect(201);

    expect(patientResponse.body.regNo).toBe('REG-00000001');

    const encounterResponse = await request(app.getHttpServer())
      .post('/encounters')
      .set('Host', 'tenant-a.test')
      .send({
        patientId: patientResponse.body.id,
        type: 'LAB',
      })
      .expect(201);

    createdEncounterId = encounterResponse.body.id;
    expect(encounterResponse.body.encounterCode).toBe('LAB-2026-000001');

    await request(app.getHttpServer())
      .post(`/encounters/${createdEncounterId}:start-prep`)
      .set('Host', 'tenant-a.test')
      .expect(200);

    await request(app.getHttpServer())
      .post(`/encounters/${createdEncounterId}:save-prep`)
      .set('Host', 'tenant-a.test')
      .send({
        specimenType: 'Blood',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/encounters/${createdEncounterId}:start-main`)
      .set('Host', 'tenant-a.test')
      .expect(200);

    await request(app.getHttpServer())
      .post(`/encounters/${createdEncounterId}:finalize`)
      .set('Host', 'tenant-a.test')
      .expect(200);

    const documentCommandResponse = await request(app.getHttpServer())
      .post(`/encounters/${createdEncounterId}:document`)
      .set('Host', 'tenant-a.test')
      .send({
        documentType: 'ENCOUNTER_SUMMARY_V1',
      })
      .expect(200);

    createdDocumentId = documentCommandResponse.body.id;
    expect(createdDocumentId).toBeDefined();

    const documentResponse = await request(app.getHttpServer())
      .get(`/documents/${createdDocumentId}`)
      .set('Host', 'tenant-a.test')
      .expect(200);

    expect(documentResponse.body.status).toBe('RENDERED');
    expect(documentResponse.body.payloadHash).toHaveLength(64);
    expect(documentResponse.body.pdfHash).toHaveLength(64);
    expectedPdfHash = documentResponse.body.pdfHash;

    const fileResponse = await request(app.getHttpServer())
      .get(`/documents/${createdDocumentId}/file`)
      .set('Host', 'tenant-a.test')
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    expect(fileResponse.headers['content-type']).toContain('application/pdf');
    expect(Buffer.isBuffer(fileResponse.body)).toBe(true);
    expect((fileResponse.body as Buffer).length).toBeGreaterThan(50);
    expect(sha256Hex(fileResponse.body as Buffer)).toBe(expectedPdfHash);

    const secondDocumentCommandResponse = await request(app.getHttpServer())
      .post(`/encounters/${createdEncounterId}:document`)
      .set('Host', 'tenant-a.test')
      .send({
        documentType: 'ENCOUNTER_SUMMARY_V1',
      })
      .expect(200);

    expect(secondDocumentCommandResponse.body.id).toBe(createdDocumentId);
    expect(secondDocumentCommandResponse.body.payloadHash).toBe(
      documentResponse.body.payloadHash,
    );
    expect(secondDocumentCommandResponse.body.pdfHash).toBe(expectedPdfHash);

    expect(
      (queueAdapter.enqueueDocumentRender as jest.Mock).mock.calls.length,
    ).toBe(1);

    await request(app.getHttpServer())
      .get(`/encounters/${createdEncounterId}`)
      .set('Host', 'tenant-a.test')
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe('DOCUMENTED');
      });
  });

  it('supports typed document requests and enforces encounter/document-type matching', async () => {
    const patientResponse = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', 'tenant-a.test')
      .send({
        name: 'Typed Document Patient',
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

    const labEncounterId = encounterResponse.body.id as string;

    await request(app.getHttpServer())
      .post(`/encounters/${labEncounterId}:start-prep`)
      .set('Host', 'tenant-a.test')
      .expect(200);

    await request(app.getHttpServer())
      .post(`/encounters/${labEncounterId}:save-prep`)
      .set('Host', 'tenant-a.test')
      .send({
        specimenType: 'Blood',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/encounters/${labEncounterId}:start-main`)
      .set('Host', 'tenant-a.test')
      .expect(200);

    await request(app.getHttpServer())
      .post(`/encounters/${labEncounterId}:finalize`)
      .set('Host', 'tenant-a.test')
      .expect(200);

    const typedDocumentResponse = await request(app.getHttpServer())
      .post(`/encounters/${labEncounterId}:document`)
      .set('Host', 'tenant-a.test')
      .send({
        documentType: 'LAB_REPORT_V1',
      })
      .expect(200);

    expect(typedDocumentResponse.body.type).toBe('LAB_REPORT_V1');

    const typedDocumentId = typedDocumentResponse.body.id as string;

    await request(app.getHttpServer())
      .get(`/documents/${typedDocumentId}`)
      .set('Host', 'tenant-a.test')
      .expect(200)
      .expect((response) => {
        expect(response.body.type).toBe('LAB_REPORT_V1');
      });

    const secondTypedResponse = await request(app.getHttpServer())
      .post(`/encounters/${labEncounterId}:document`)
      .set('Host', 'tenant-a.test')
      .send({
        documentType: 'LAB_REPORT_V1',
      })
      .expect(200);

    expect(secondTypedResponse.body.id).toBe(typedDocumentId);

    await request(app.getHttpServer())
      .post(`/encounters/${labEncounterId}:document`)
      .set('Host', 'tenant-a.test')
      .send({
        documentType: 'RAD_REPORT_V1',
      })
      .expect(409)
      .expect((response) => {
        expect(response.body.error.type).toBe('domain_error');
        expect(response.body.error.code).toBe('INVALID_DOCUMENT_TYPE');
      });
  });

  it('rejects save-main while encounter is still PREP', async () => {
    const patientResponse = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', 'tenant-a.test')
      .send({
        name: 'Prep State Guard',
      })
      .expect(201);

    const encounterResponse = await request(app.getHttpServer())
      .post('/encounters')
      .set('Host', 'tenant-a.test')
      .send({
        patientId: patientResponse.body.id,
        type: 'RAD',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/encounters/${encounterResponse.body.id}:start-prep`)
      .set('Host', 'tenant-a.test')
      .expect(200);

    await request(app.getHttpServer())
      .post(`/encounters/${encounterResponse.body.id}:save-main`)
      .set('Host', 'tenant-a.test')
      .send({
        reportText: 'Should not be accepted in PREP',
      })
      .expect(409)
      .expect((response) => {
        expect(response.body.error.type).toBe('domain_error');
        expect(response.body.error.code).toBe('INVALID_STATE');
      });
  });

  it('supports RAD main flow, finalize, and document download', async () => {
    const patientResponse = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', 'tenant-a.test')
      .send({
        name: 'Rad Main Flow',
      })
      .expect(201);

    const encounterResponse = await request(app.getHttpServer())
      .post('/encounters')
      .set('Host', 'tenant-a.test')
      .send({
        patientId: patientResponse.body.id,
        type: 'RAD',
      })
      .expect(201);

    const radEncounterId = encounterResponse.body.id as string;

    await request(app.getHttpServer())
      .post(`/encounters/${radEncounterId}:start-prep`)
      .set('Host', 'tenant-a.test')
      .expect(200);

    await request(app.getHttpServer())
      .post(`/encounters/${radEncounterId}:start-main`)
      .set('Host', 'tenant-a.test')
      .expect(200);

    await request(app.getHttpServer())
      .post(`/encounters/${radEncounterId}:save-main`)
      .set('Host', 'tenant-a.test')
      .send({
        reportText: 'No acute cardiopulmonary abnormality.',
        impression: 'Stable chest radiograph.',
        radiologistName: 'Dr. Ray',
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.type).toBe('RAD');
        expect(response.body.radMain.reportText).toContain('No acute');
      });

    await request(app.getHttpServer())
      .get(`/encounters/${radEncounterId}/main`)
      .set('Host', 'tenant-a.test')
      .expect(200)
      .expect((response) => {
        expect(response.body.type).toBe('RAD');
        expect(response.body.radMain.reportText).toContain('No acute');
      });

    await request(app.getHttpServer())
      .post(`/encounters/${radEncounterId}:finalize`)
      .set('Host', 'tenant-a.test')
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe('FINALIZED');
      });

    const documentResponse = await request(app.getHttpServer())
      .post(`/encounters/${radEncounterId}:document`)
      .set('Host', 'tenant-a.test')
      .send({
        documentType: 'RAD_REPORT_V1',
      })
      .expect(200);

    expect(documentResponse.body.status).toBe('RENDERED');
    expect(documentResponse.body.type).toBe('RAD_REPORT_V1');
    expect(documentResponse.body.templateKey).toBe('RAD_REPORT_V1');

    const secondDocumentResponse = await request(app.getHttpServer())
      .post(`/encounters/${radEncounterId}:document`)
      .set('Host', 'tenant-a.test')
      .send({
        documentType: 'RAD_REPORT_V1',
      })
      .expect(200);

    expect(secondDocumentResponse.body.id).toBe(documentResponse.body.id);
    expect(secondDocumentResponse.body.pdfHash).toBe(documentResponse.body.pdfHash);
    expect(secondDocumentResponse.body.payloadHash).toBe(
      documentResponse.body.payloadHash,
    );

    await request(app.getHttpServer())
      .get(`/documents/${documentResponse.body.id}/file`)
      .set('Host', 'tenant-a.test')
      .buffer(true)
      .parse(binaryParser)
      .expect(200)
      .expect((response) => {
        expect(response.headers['content-type']).toContain('application/pdf');
        expect((response.body as Buffer).length).toBeGreaterThan(50);
      });
  });

  it('supports OPD flow and OPD_SUMMARY_V1 document generation', async () => {
    const patientResponse = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', 'tenant-a.test')
      .send({
        name: 'Opd Main Flow',
      })
      .expect(201);

    const encounterResponse = await request(app.getHttpServer())
      .post('/encounters')
      .set('Host', 'tenant-a.test')
      .send({
        patientId: patientResponse.body.id,
        type: 'OPD',
      })
      .expect(201);

    const opdEncounterId = encounterResponse.body.id as string;

    await request(app.getHttpServer())
      .post(`/encounters/${opdEncounterId}:start-prep`)
      .set('Host', 'tenant-a.test')
      .expect(200);

    await request(app.getHttpServer())
      .post(`/encounters/${opdEncounterId}:start-main`)
      .set('Host', 'tenant-a.test')
      .expect(200);

    await request(app.getHttpServer())
      .post(`/encounters/${opdEncounterId}:finalize`)
      .set('Host', 'tenant-a.test')
      .expect(200);

    const documentResponse = await request(app.getHttpServer())
      .post(`/encounters/${opdEncounterId}:document`)
      .set('Host', 'tenant-a.test')
      .send({
        documentType: 'OPD_SUMMARY_V1',
      })
      .expect(200);

    expect(documentResponse.body.status).toBe('RENDERED');
    expect(documentResponse.body.type).toBe('OPD_SUMMARY_V1');
    expect(documentResponse.body.templateKey).toBe('OPD_SUMMARY_V1');
  });

  it('blocks cross-tenant document reads', async () => {
    expect(createdDocumentId).toBeDefined();

    await request(app.getHttpServer())
      .get(`/documents/${createdDocumentId}`)
      .set('Host', 'tenant-b.test')
      .expect(404)
      .expect((response) => {
        expect(response.body.error.type).toBe('not_found');
      });

    await request(app.getHttpServer())
      .get(`/documents/${createdDocumentId}/file`)
      .set('Host', 'tenant-b.test')
      .expect(404)
      .expect((response) => {
        expect(response.body.error.type).toBe('not_found');
      });

    await request(app.getHttpServer())
      .post(`/encounters/${createdEncounterId}:document`)
      .set('Host', 'tenant-b.test')
      .send({
        documentType: 'ENCOUNTER_SUMMARY_V1',
      })
      .expect(404)
      .expect((response) => {
        expect(response.body.error.type).toBe('not_found');
      });

    await request(app.getHttpServer())
      .get(`/encounters/${createdEncounterId}/main`)
      .set('Host', 'tenant-b.test')
      .expect(404)
      .expect((response) => {
        expect(response.body.error.type).toBe('not_found');
      });
  });
});
