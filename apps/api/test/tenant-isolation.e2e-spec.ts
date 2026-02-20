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

function createPrismaMock() {
  const patients: PatientRecord[] = [];
  const patientCounters = new Map<string, number>();
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
    patient: {
      create: jest.fn(
        async ({
          data,
        }: {
          data: Partial<PatientRecord> & {
            tenantId: string;
            regNo: string;
            name: string;
          };
        }) => {
          const record: PatientRecord = {
            id: `patient-${patients.length + 1}`,
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
      findMany: jest.fn(
        async ({
          where,
          skip = 0,
          take = 20,
        }: {
          where: { tenantId: string };
          skip?: number;
          take?: number;
        }) => {
          const scoped = patients.filter(
            (patient) => patient.tenantId === where.tenantId,
          );
          return scoped.slice(skip, skip + take);
        },
      ),
      count: jest.fn(async ({ where }: { where: { tenantId: string } }) => {
        return patients.filter((patient) => patient.tenantId === where.tenantId)
          .length;
      }),
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
    },
    $transaction: jest.fn(async (operation: (tx: any) => Promise<unknown>) =>
      operation(prismaMock),
    ),
  };

  return prismaMock;
}

describe('Tenant isolation (integration)', () => {
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

  it('prevents tenant B from reading tenant A patient data', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/patients')
      .set('Host', 'tenant-a.test')
      .send({
        name: 'Alice A',
      })
      .expect(201);

    expect(createResponse.body.tenantId).toBe('tenant-a');
    expect(createResponse.body.regNo).toBe('REG-00000001');

    await request(app.getHttpServer())
      .get('/patients')
      .set('Host', 'tenant-b.test')
      .expect(200)
      .expect((response) => {
        expect(response.body.total).toBe(0);
        expect(response.body.data).toEqual([]);
      });

    await request(app.getHttpServer())
      .get(`/patients/${createResponse.body.id}`)
      .set('Host', 'tenant-b.test')
      .expect(404)
      .expect((response) => {
        expect(response.body.error.type).toBe('not_found');
      });
  });
});
