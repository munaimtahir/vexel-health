import { ClsService } from 'nestjs-cls';
import { PatientsService } from './patients.service';

describe('PatientsService', () => {
  it('generates monotonic tenant-scoped REG numbers', async () => {
    const counters = new Map<string, number>();
    const prismaMock: any = {};

    prismaMock.patientSequence = {
      upsert: jest.fn(async ({ where }: { where: { tenantId: string } }) => {
        const currentValue = counters.get(where.tenantId) ?? 0;
        const nextValue = currentValue + 1;
        counters.set(where.tenantId, nextValue);
        return { tenantId: where.tenantId, lastValue: nextValue };
      }),
    };

    prismaMock.patient = {
      create: jest.fn(
        async ({ data }: { data: Record<string, unknown> }) => data,
      ),
    };

    prismaMock.$transaction = jest.fn(
      async (operation: (tx: any) => Promise<unknown>) => {
        return operation(prismaMock);
      },
    );

    const clsMock: Pick<ClsService, 'get'> = {
      get: jest.fn().mockReturnValue('tenant-a'),
    };

    const service = new PatientsService(prismaMock, clsMock as ClsService);

    const first = await service.create({ name: 'Patient 1' });
    const second = await service.create({ name: 'Patient 2' });

    expect(first.regNo).toBe('REG-00000001');
    expect(second.regNo).toBe('REG-00000002');
  });
});
