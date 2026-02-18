import { ClsService } from 'nestjs-cls';
import { EncountersService } from './encounters.service';

describe('EncountersService', () => {
  it('generates tenant+type yearly encounter codes with reset per year', async () => {
    const sequenceMap = new Map<string, number>();
    const prismaMock: any = {};

    prismaMock.patient = {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 'patient-1', tenantId: 'tenant-a' }),
    };

    prismaMock.encounterSequence = {
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
          const key = [
            where.tenantId_type_year.tenantId,
            where.tenantId_type_year.type,
            where.tenantId_type_year.year,
          ].join(':');
          const currentValue = sequenceMap.get(key) ?? 0;
          const nextValue = currentValue + 1;
          sequenceMap.set(key, nextValue);
          return {
            tenantId: where.tenantId_type_year.tenantId,
            type: where.tenantId_type_year.type,
            year: where.tenantId_type_year.year,
            lastValue: nextValue,
          };
        },
      ),
    };

    prismaMock.encounter = {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: `encounter-${prismaMock.encounter.create.mock.calls.length}`,
        ...data,
      })),
    };

    prismaMock.$transaction = jest.fn(
      async (operation: (tx: any) => Promise<unknown>) => {
        return operation(prismaMock);
      },
    );

    const clsMock: Pick<ClsService, 'get'> = {
      get: jest.fn().mockReturnValue('tenant-a'),
    };

    const service = new EncountersService(prismaMock, clsMock as ClsService);

    const first = await service.create({
      patientId: 'patient-1',
      type: 'opd',
      startedAt: '2026-01-15T00:00:00.000Z',
    });
    const second = await service.create({
      patientId: 'patient-1',
      type: 'OPD',
      startedAt: '2026-03-01T00:00:00.000Z',
    });
    const third = await service.create({
      patientId: 'patient-1',
      type: 'opd',
      startedAt: '2027-01-01T00:00:00.000Z',
    });

    expect(first.encounterCode).toBe('OPD-2026-000001');
    expect(second.encounterCode).toBe('OPD-2026-000002');
    expect(third.encounterCode).toBe('OPD-2027-000001');
  });
});
