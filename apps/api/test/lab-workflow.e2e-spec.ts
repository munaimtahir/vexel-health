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
  type DocumentRenderJobPayload,
  type DocumentRenderQueue,
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
  createdAt: Date;
  dob: Date | null;
  gender: string | null;
  phone: string | null;
  mrn: string | null;
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

type LabTestRecord = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  department: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type LabParameterRecord = {
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
  createdAt: Date;
  updatedAt: Date;
};

type LabOrderRecord = {
  id: string;
  tenantId: string;
  encounterId: string;
  testId: string;
  status: 'ORDERED' | 'RESULTS_ENTERED' | 'VERIFIED';
  createdAt: Date;
  updatedAt: Date;
};

type LabResultRecord = {
  id: string;
  tenantId: string;
  orderItemId: string;
  parameterId: string;
  value: string;
  valueNumeric: number | null;
  flag: 'LOW' | 'HIGH' | 'NORMAL' | 'ABNORMAL' | 'UNKNOWN';
  enteredBy: string | null;
  enteredAt: Date | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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

type InvoiceRecord = {
  id: string;
  tenantId: string;
  patientId: string;
  encounterId: string | null;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: Date;
};

type PaymentRecord = {
  id: string;
  tenantId: string;
  invoiceId: string;
  method: string;
  amount: number;
  receivedAt: Date;
  reference: string | null;
};

type MemoryState = {
  patients: PatientRecord[];
  encounters: EncounterRecord[];
  labPreps: LabPrepRecord[];
  labTests: LabTestRecord[];
  labParameters: LabParameterRecord[];
  labOrders: LabOrderRecord[];
  labResults: LabResultRecord[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  documents: DocumentRecord[];
  auditEvents: Array<{
    id: string;
    tenantId: string;
    actorUserId: string | null;
    eventType: string;
    entityType: string;
    entityId: string;
    payloadJson: string | null;
    correlationId: string | null;
  }>;
  files: Map<string, Buffer>;
  patientCounters: Map<string, number>;
  encounterCounters: Map<string, number>;
  tenantDomains: Map<string, string>;
};

function sha256Hex(input: Buffer | string): string {
  return createHash('sha256').update(input).digest('hex');
}

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

function createPrismaMock(state: MemoryState) {
  const makeId = (prefix: number): string =>
    `00000000-0000-4000-8000-${String(prefix).padStart(12, '0')}`;

  const prismaMock: Record<string, any> = {
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
            encounterCode: string;
            type: string;
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
      findFirst: jest.fn(
        async ({
          where,
          include,
        }: {
          where: {
            id: string;
            tenantId: string;
          };
          include?: Record<string, unknown>;
        }) => {
          const encounter = state.encounters.find(
            (item) => item.id === where.id && item.tenantId === where.tenantId,
          );
          if (!encounter) {
            return null;
          }

          if (!include) {
            return encounter;
          }

          const patient = state.patients.find(
            (item) =>
              item.id === encounter.patientId && item.tenantId === encounter.tenantId,
          );
          if (!patient) {
            return null;
          }

          const labPrep =
            state.labPreps.find(
              (item) =>
                item.tenantId === encounter.tenantId &&
                item.encounterId === encounter.id,
            ) ?? null;

          const orderItems = state.labOrders
            .filter(
              (item) =>
                item.tenantId === encounter.tenantId &&
                item.encounterId === encounter.id,
            )
            .map((orderItem) => {
              const test = state.labTests.find(
                (item) =>
                  item.id === orderItem.testId && item.tenantId === encounter.tenantId,
              );
              const testParameters = state.labParameters
                .filter(
                  (item) =>
                    item.tenantId === encounter.tenantId &&
                    item.testId === orderItem.testId,
                )
                .sort((a, b) => a.displayOrder - b.displayOrder);

              return {
                ...orderItem,
                test: test
                  ? {
                      ...test,
                      parameters: testParameters,
                    }
                  : null,
                results: state.labResults.filter(
                  (result) =>
                    result.tenantId === encounter.tenantId &&
                    result.orderItemId === orderItem.id,
                ),
              };
            })
            .filter((item) => item.test !== null);

          return {
            ...encounter,
            patient,
            labPrep,
            radPrep: null,
            opdPrep: null,
            bbPrep: null,
            ipdPrep: null,
            labMain: null,
            radMain: null,
            opdMain: null,
            bbMain: null,
            ipdMain: null,
            labOrderItems: orderItems,
          };
        },
      ),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { status?: string; endedAt?: Date };
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
    labEncounterPrep: {
      upsert: jest.fn(
        async ({ where, create, update }: any) => {
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
            id: makeId(2000 + state.labPreps.length + 1),
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
      findFirst: jest.fn(async ({ where }: any) => {
        return (
          state.labPreps.find(
            (item) =>
              item.tenantId === where.tenantId &&
              item.encounterId === where.encounterId,
          ) ?? null
        );
      }),
    },
    labTestDefinition: {
      create: jest.fn(async ({ data }: any) => {
        const record: LabTestRecord = {
          id: makeId(3000 + state.labTests.length + 1),
          tenantId: data.tenantId,
          code: data.code,
          name: data.name,
          department: data.department,
          active: data.active,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        state.labTests.push(record);
        return record;
      }),
      findMany: jest.fn(async ({ where }: any) => {
        return state.labTests.filter((item) => item.tenantId === where.tenantId);
      }),
      count: jest.fn(async ({ where }: any) => {
        return state.labTests.filter((item) => item.tenantId === where.tenantId).length;
      }),
      findFirst: jest.fn(async ({ where }: any) => {
        return (
          state.labTests.find((item) => {
            if (item.tenantId !== where.tenantId) {
              return false;
            }
            if (where.id && item.id !== where.id) {
              return false;
            }
            if (where.active !== undefined && item.active !== where.active) {
              return false;
            }
            return true;
          }) ?? null
        );
      }),
    },
    labTestParameter: {
      create: jest.fn(async ({ data }: any) => {
        const record: LabParameterRecord = {
          id: makeId(4000 + state.labParameters.length + 1),
          tenantId: data.tenantId,
          testId: data.testId,
          name: data.name,
          unit: data.unit ?? null,
          refLow: data.refLow ?? null,
          refHigh: data.refHigh ?? null,
          refText: data.refText ?? null,
          displayOrder: data.displayOrder,
          active: data.active,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        state.labParameters.push(record);
        return record;
      }),
      findMany: jest.fn(async ({ where }: any) => {
        let scoped = state.labParameters.filter(
          (item) =>
            item.tenantId === where.tenantId &&
            (!where.testId || item.testId === where.testId),
        );

        if (where.active !== undefined) {
          scoped = scoped.filter((item) => item.active === where.active);
        }

        return scoped;
      }),
      findFirst: jest.fn(async ({ where, orderBy, select }: any) => {
        let scoped = state.labParameters.filter(
          (item) =>
            item.tenantId === where.tenantId &&
            item.testId === where.testId,
        );

        if (orderBy?.displayOrder === 'desc') {
          scoped = scoped.sort((a, b) => b.displayOrder - a.displayOrder);
        }

        const first = scoped[0] ?? null;
        if (!first) {
          return null;
        }

        if (select?.displayOrder) {
          return { displayOrder: first.displayOrder };
        }

        return first;
      }),
      count: jest.fn(async ({ where }: any) => {
        return state.labParameters.filter(
          (item) => item.tenantId === where.tenantId && item.testId === where.testId,
        ).length;
      }),
    },
    labOrderItem: {
      create: jest.fn(async ({ data }: any) => {
        const record: LabOrderRecord = {
          id: makeId(5000 + state.labOrders.length + 1),
          tenantId: data.tenantId,
          encounterId: data.encounterId,
          testId: data.testId,
          status: data.status,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        state.labOrders.push(record);
        return record;
      }),
      findMany: jest.fn(async ({ where, select }: any) => {
        const scoped = state.labOrders.filter((item) => {
          if (item.tenantId !== where.tenantId) {
            return false;
          }
          if (where.encounterId && item.encounterId !== where.encounterId) {
            return false;
          }
          return true;
        });

        if (select?.id) {
          return scoped.map((item) => ({ id: item.id }));
        }

        return scoped;
      }),
      findFirst: jest.fn(async ({ where, include }: any) => {
        const found = state.labOrders.find((item) => {
          if (item.tenantId !== where.tenantId) {
            return false;
          }
          if (where.id && item.id !== where.id) {
            return false;
          }
          if (where.encounterId && item.encounterId !== where.encounterId) {
            return false;
          }
          if (where.status?.not && item.status === where.status.not) {
            return false;
          }
          return true;
        });

        if (!found) {
          return null;
        }

        if (!include?.test) {
          return found;
        }

        const test = state.labTests.find((item) => item.id === found.testId);
        if (!test) {
          return null;
        }

        return {
          ...found,
          test,
        };
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const order = state.labOrders.find((item) => item.id === where.id);
        if (!order) {
          throw new Error('lab order not found');
        }

        if (data.status !== undefined) {
          order.status = data.status;
        }
        order.updatedAt = new Date();
        return order;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const order of state.labOrders) {
          if (order.id !== where.id || order.tenantId !== where.tenantId) {
            continue;
          }

          if (where.status?.not && order.status === where.status.not) {
            continue;
          }

          if (where.status && typeof where.status === 'string' && order.status !== where.status) {
            continue;
          }

          if (data.status !== undefined) {
            order.status = data.status;
          }
          order.updatedAt = new Date();
          count += 1;
        }
        return { count };
      }),
      count: jest.fn(async ({ where }: any) => {
        return state.labOrders.filter(
          (item) =>
            item.tenantId === where.tenantId && item.encounterId === where.encounterId,
        ).length;
      }),
    },
    labResultItem: {
      createMany: jest.fn(async ({ data }: any) => {
        for (const item of data) {
          const record: LabResultRecord = {
            id: makeId(6000 + state.labResults.length + 1),
            tenantId: item.tenantId,
            orderItemId: item.orderItemId,
            parameterId: item.parameterId,
            value: item.value,
            valueNumeric: item.valueNumeric ?? null,
            flag: item.flag,
            enteredBy: item.enteredBy ?? null,
            enteredAt: item.enteredAt ?? null,
            verifiedBy: item.verifiedBy ?? null,
            verifiedAt: item.verifiedAt ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          state.labResults.push(record);
        }

        return { count: data.length };
      }),
      findMany: jest.fn(async ({ where }: any) => {
        return state.labResults.filter((item) => {
          if (item.tenantId !== where.tenantId) {
            return false;
          }
          if (where.orderItemId && item.orderItemId !== where.orderItemId) {
            return false;
          }
          if (where.parameterId?.in) {
            return where.parameterId.in.includes(item.parameterId);
          }
          return true;
        });
      }),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const existing = state.labResults.find(
          (item) =>
            item.tenantId === where.tenantId_orderItemId_parameterId.tenantId &&
            item.orderItemId === where.tenantId_orderItemId_parameterId.orderItemId &&
            item.parameterId === where.tenantId_orderItemId_parameterId.parameterId,
        );

        if (existing) {
          existing.value = update.value;
          existing.valueNumeric = update.valueNumeric ?? null;
          existing.flag = update.flag;
          existing.enteredBy = update.enteredBy ?? null;
          existing.enteredAt = update.enteredAt ?? null;
          existing.verifiedBy = update.verifiedBy ?? null;
          existing.verifiedAt = update.verifiedAt ?? null;
          existing.updatedAt = new Date();
          return existing;
        }

        const record: LabResultRecord = {
          id: makeId(6000 + state.labResults.length + 1),
          tenantId: create.tenantId,
          orderItemId: create.orderItemId,
          parameterId: create.parameterId,
          value: create.value,
          valueNumeric: create.valueNumeric ?? null,
          flag: create.flag,
          enteredBy: create.enteredBy ?? null,
          enteredAt: create.enteredAt ?? null,
          verifiedBy: create.verifiedBy ?? null,
          verifiedAt: create.verifiedAt ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        state.labResults.push(record);
        return record;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;

        for (const item of state.labResults) {
          if (
            item.tenantId === where.tenantId &&
            item.orderItemId === where.orderItemId &&
            (!where.parameterId?.in || where.parameterId.in.includes(item.parameterId))
          ) {
            item.verifiedBy = data.verifiedBy ?? item.verifiedBy;
            item.verifiedAt = data.verifiedAt ?? item.verifiedAt;
            item.updatedAt = new Date();
            count += 1;
          }
        }

        return { count };
      }),
    },
    invoice: {
      findFirst: jest.fn(async ({ where }: any) => {
        return (
          state.invoices.find(
            (inv) =>
              inv.tenantId === where.tenantId &&
              (where.encounterId == null || inv.encounterId === where.encounterId),
          ) ?? null
        );
      }),
      create: jest.fn(async ({ data, include }: any) => {
        const record: InvoiceRecord = {
          id: makeId(9000 + state.invoices.length + 1),
          tenantId: data.tenantId,
          patientId: data.patientId,
          encounterId: data.encounterId ?? null,
          status: data.status ?? 'UNPAID',
          totalAmount: typeof data.totalAmount === 'object' && data.totalAmount?.toString ? Number(data.totalAmount.toString()) : Number(data.totalAmount ?? 0),
          currency: data.currency ?? 'USD',
          createdAt: new Date(),
        };
        state.invoices.push(record);
        return include?.payments ? { ...record, payments: state.payments.filter((p) => p.invoiceId === record.id) } : record;
      }),
      findUniqueOrThrow: jest.fn(async ({ where, include }: any) => {
        const inv = state.invoices.find((i) => i.id === where.id);
        if (!inv) throw new Error('Invoice not found');
        const payments = include?.payments
          ? state.payments.filter((p) => p.invoiceId === inv.id).sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime())
          : [];
        return { ...inv, payments };
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const inv = state.invoices.find((i) => i.id === where.id);
        if (!inv) throw new Error('Invoice not found');
        if (data.status !== undefined) inv.status = data.status;
        return inv;
      }),
    },
    payment: {
      create: jest.fn(async ({ data }: any) => {
        const record: PaymentRecord = {
          id: makeId(9500 + state.payments.length + 1),
          tenantId: data.tenantId,
          invoiceId: data.invoiceId,
          method: data.method,
          amount: typeof data.amount === 'object' && data.amount?.toString ? Number(data.amount.toString()) : Number(data.amount),
          receivedAt: data.receivedAt ? new Date(data.receivedAt) : new Date(),
          reference: data.reference ?? null,
        };
        state.payments.push(record);
        return record;
      }),
    },
    document: {
      findFirst: jest.fn(async ({ where }: any) => {
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
            return true;
          }) ?? null
        );
      }),
      create: jest.fn(async ({ data }: any) => {
        const record: DocumentRecord = {
          id: makeId(7000 + state.documents.length + 1),
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
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const document = state.documents.find((item) => item.id === where.id);
        if (!document) {
          throw new Error('document not found');
        }

        Object.assign(document, data);
        return document;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
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
      }),
    },
    auditEvent: {
      create: jest.fn(async ({ data }: any) => {
        const record = {
          id: makeId(8000 + state.auditEvents.length + 1),
          tenantId: data.tenantId,
          actorUserId: data.actorUserId ?? null,
          eventType: data.eventType,
          entityType: data.entityType,
          entityId: data.entityId,
          payloadJson: data.payloadJson ?? null,
          correlationId: data.correlationId ?? null,
        };
        state.auditEvents.push(record);
        return record;
      }),
    },
    $transaction: jest.fn(
      async (operation: (tx: Record<string, unknown>) => Promise<unknown>) => {
        return operation(prismaMock);
      },
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

describe('LAB workflow (e2e)', () => {
  let app: INestApplication;

  const state: MemoryState = {
    patients: [],
    encounters: [],
    labPreps: [],
    labTests: [],
    labParameters: [],
    labOrders: [],
    labResults: [],
    invoices: [],
    payments: [],
    documents: [],
    auditEvents: [],
    files: new Map<string, Buffer>(),
    patientCounters: new Map<string, number>(),
    encounterCounters: new Map<string, number>(),
    tenantDomains: new Map<string, string>([
      ['tenant-a.test', 'tenant-a'],
      ['tenant-b.test', 'tenant-b'],
    ]),
  };
  const tenantAAllLabPermissionsToken =
    'mock.tenant-a.user-a.LAB_CATALOG_WRITE,LAB_ORDER_WRITE,LAB_RESULTS_WRITE,LAB_RESULTS_VERIFY,LAB_REPORT_PUBLISH';
  const tenantAWriteWithoutPublishToken =
    'mock.tenant-a.user-b.LAB_CATALOG_WRITE,LAB_ORDER_WRITE,LAB_RESULTS_WRITE,LAB_RESULTS_VERIFY';
  const tenantBPublishToken = 'mock.tenant-b.user-c.LAB_REPORT_PUBLISH';

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
        (item) =>
          item.id === document.encounterId && item.tenantId === payload.tenantId,
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

  it('returns 403 for LAB publish without required permission', async () => {
    await request(app.getHttpServer())
      .post('/lab/tests')
      .set('Host', 'tenant-a.test')
      .set('Authorization', `Bearer ${tenantAWriteWithoutPublishToken}`)
      .send({
        code: 'RBAC403',
        name: 'RBAC Denied Test',
        department: 'Biochemistry',
      })
      .expect(201);

    const patientResponse = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', 'tenant-a.test')
      .send({
        name: 'RBAC Patient',
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
      .post(`/encounters/${encounterResponse.body.id}:lab-publish`)
      .set('Host', 'tenant-a.test')
      .set('Authorization', `Bearer ${tenantAWriteWithoutPublishToken}`)
      .expect(403)
      .expect((response) => {
        expect(response.body.error.type).toBe('auth_error');
      });
  });

  it('runs LAB catalog -> order -> results -> verify -> finalize -> publish with tenant isolation', async () => {
    const patientResponse = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', 'tenant-a.test')
      .send({
        name: 'Albumin Patient',
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

    const encounterId = encounterResponse.body.id as string;

    await request(app.getHttpServer())
      .post(`/encounters/${encounterId}:start-prep`)
      .set('Host', 'tenant-a.test')
      .expect(200);

    await request(app.getHttpServer())
      .post(`/encounters/${encounterId}:save-prep`)
      .set('Host', 'tenant-a.test')
      .send({
        specimenType: 'Blood',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/encounters/${encounterId}:start-main`)
      .set('Host', 'tenant-a.test')
      .expect(200);

    const createTestResponse = await request(app.getHttpServer())
      .post('/lab/tests')
      .set('Host', 'tenant-a.test')
      .set('Authorization', `Bearer ${tenantAAllLabPermissionsToken}`)
      .send({
        code: 'ALB',
        name: 'Serum Albumin',
        department: 'Biochemistry',
      })
      .expect(201);

    const testId = createTestResponse.body.id as string;

    await request(app.getHttpServer())
      .post(`/lab/tests/${testId}/parameters`)
      .set('Host', 'tenant-a.test')
      .set('Authorization', `Bearer ${tenantAAllLabPermissionsToken}`)
      .send({
        name: 'Albumin',
        unit: 'g/dL',
        refLow: 3.5,
        refHigh: 5,
        displayOrder: 1,
      })
      .expect(201);

    const addTestResponse = await request(app.getHttpServer())
      .post(`/encounters/${encounterId}:lab-add-test`)
      .set('Host', 'tenant-a.test')
      .set('Authorization', `Bearer ${tenantAAllLabPermissionsToken}`)
      .set('x-idempotency-key', 'order-lab-add-1')
      .send({
        testId,
      })
      .expect(200);

    const orderItemId = addTestResponse.body.orderItem.id as string;
    const parameterId = addTestResponse.body.parameters[0].id as string;

    const paymentResponse = await request(app.getHttpServer())
      .post(`/encounters/${encounterId}/payments`)
      .set('Host', 'tenant-a.test')
      .send({
        amount: 500,
        method: 'CASH',
        reference: 'e2e-ref-1',
      })
      .expect(200);
    expect(paymentResponse.body.invoice).toBeDefined();
    expect(paymentResponse.body.invoice.encounter_id).toBe(encounterId);
    expect(paymentResponse.body.payments).toHaveLength(1);
    expect(paymentResponse.body.payments[0].amount).toBe(500);

    await request(app.getHttpServer())
      .post(`/encounters/${encounterId}:lab-enter-results`)
      .set('Host', 'tenant-a.test')
      .set('Authorization', `Bearer ${tenantAAllLabPermissionsToken}`)
      .set('x-idempotency-key', 'enter-results-1')
      .send({
        orderItemId,
        results: [
          {
            parameterId,
            value: '4.5',
          },
        ],
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.orderItem.status).toBe('RESULTS_ENTERED');
        expect(response.body.results[0].flag).toBe('NORMAL');
      });

    await request(app.getHttpServer())
      .post(`/encounters/${encounterId}:lab-enter-results`)
      .set('Host', 'tenant-a.test')
      .set('Authorization', `Bearer ${tenantAAllLabPermissionsToken}`)
      .set('x-idempotency-key', 'enter-results-1')
      .send({
        orderItemId,
        results: [
          {
            parameterId,
            value: '4.5',
          },
        ],
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.results).toHaveLength(1);
        expect(response.body.results[0].value).toBe('4.5');
      });

    await request(app.getHttpServer())
      .post(`/encounters/${encounterId}:finalize`)
      .set('Host', 'tenant-a.test')
      .expect(409)
      .expect((response) => {
        expect(response.body.error.type).toBe('domain_error');
        expect(response.body.error.code).toBe(
          'ENCOUNTER_FINALIZE_BLOCKED_UNVERIFIED_LAB',
        );
      });

    await request(app.getHttpServer())
      .post(`/encounters/${encounterId}:lab-verify`)
      .set('Host', 'tenant-a.test')
      .set('Authorization', `Bearer ${tenantAAllLabPermissionsToken}`)
      .set('x-idempotency-key', 'verify-results-1')
      .send({
        orderItemId,
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.orderItem.status).toBe('VERIFIED');
      });

    await request(app.getHttpServer())
      .post(`/encounters/${encounterId}:lab-verify`)
      .set('Host', 'tenant-a.test')
      .set('Authorization', `Bearer ${tenantAAllLabPermissionsToken}`)
      .set('x-idempotency-key', 'verify-results-1')
      .send({
        orderItemId,
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.orderItem.status).toBe('VERIFIED');
      });

    await request(app.getHttpServer())
      .post(`/encounters/${encounterId}:lab-verify`)
      .set('Host', 'tenant-a.test')
      .set('Authorization', `Bearer ${tenantAWriteWithoutPublishToken}`)
      .send({
        orderItemId,
      })
      .expect(409)
      .expect((response) => {
        expect(response.body.error.code).toBe('LAB_ALREADY_VERIFIED');
        expect(response.body.error.details.verified_by).toBe('user-a');
      });

    await request(app.getHttpServer())
      .post(`/encounters/${encounterId}:finalize`)
      .set('Host', 'tenant-a.test')
      .expect(200);

    const firstPublishResponse = await request(app.getHttpServer())
      .post(`/encounters/${encounterId}:lab-publish`)
      .set('Host', 'tenant-a.test')
      .set('Authorization', `Bearer ${tenantAAllLabPermissionsToken}`)
      .set('x-idempotency-key', 'publish-lab-1')
      .expect(200)
      .expect((response) => {
        expect(response.body.type).toBe('LAB_REPORT_V1');
      });

    expect(firstPublishResponse.body.id).toBeDefined();
    expect(firstPublishResponse.body.payloadHash).toBeDefined();

    const documentId = firstPublishResponse.body.id as string;

    const fileResponse = await request(app.getHttpServer())
      .get(`/documents/${documentId}/file`)
      .set('Host', 'tenant-a.test')
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    expect(fileResponse.headers['content-type']).toContain('application/pdf');
    expect(Buffer.isBuffer(fileResponse.body)).toBe(true);

    const secondPublishResponse = await request(app.getHttpServer())
      .post(`/encounters/${encounterId}:lab-publish`)
      .set('Host', 'tenant-a.test')
      .set('Authorization', `Bearer ${tenantAAllLabPermissionsToken}`)
      .set('x-idempotency-key', 'publish-lab-1')
      .expect(200);

    expect(secondPublishResponse.body.id).toBe(documentId);
    expect(secondPublishResponse.body.pdfHash).toBe(firstPublishResponse.body.pdfHash);
    expect(state.documents).toHaveLength(1);
    expect((queueAdapter.enqueueDocumentRender as jest.Mock).mock.calls.length).toBe(1);

    await request(app.getHttpServer())
      .get('/lab/tests')
      .set('Host', 'tenant-b.test')
      .expect(200)
      .expect((response) => {
        expect(response.body.total).toBe(0);
      });

    await request(app.getHttpServer())
      .get(`/lab/tests/${testId}`)
      .set('Host', 'tenant-b.test')
      .expect(404);

    await request(app.getHttpServer())
      .get(`/documents/${documentId}`)
      .set('Host', 'tenant-b.test')
      .expect(404);

    await request(app.getHttpServer())
      .get(`/documents/${documentId}/file`)
      .set('Host', 'tenant-b.test')
      .expect(404);

    await request(app.getHttpServer())
      .post(`/encounters/${encounterId}:lab-publish`)
      .set('Host', 'tenant-b.test')
      .set('Authorization', `Bearer ${tenantBPublishToken}`)
      .expect(404);

    expect(state.auditEvents.some((event) => event.eventType === 'lims.order.created')).toBe(
      true,
    );
    expect(
      state.auditEvents.some(
        (event) => event.eventType === 'lims.report.publish.requested',
      ),
    ).toBe(true);
  });
});
