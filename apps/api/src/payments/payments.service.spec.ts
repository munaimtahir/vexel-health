import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: PrismaService;

  const tenantId = 'tenant-1';
  const encounterId = 'enc-1';
  const patientId = 'patient-1';

  beforeEach(async () => {
    const mockPrisma = {
      encounter: {
        findFirst: jest.fn(),
      },
      invoice: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        create: jest.fn(),
      },
    };
    const mockCls = {
      get: jest.fn().mockReturnValue(tenantId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ClsService, useValue: mockCls },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('throws 404 when encounter not found', async () => {
    (prisma.encounter.findFirst as jest.Mock).mockResolvedValue(null);
    const dto: RecordPaymentDto = { amount: 100, method: 'CASH' };
    await expect(service.recordPayment(encounterId, dto)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('creates invoice and payment when no invoice exists (happy path)', async () => {
    (prisma.encounter.findFirst as jest.Mock).mockResolvedValue({
      id: encounterId,
      patientId,
    });
    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.invoice.create as jest.Mock).mockResolvedValue({
      id: 'inv-1',
      encounterId,
      totalAmount: { toString: () => '0' },
      payments: [],
    });
    (prisma.payment.create as jest.Mock).mockResolvedValue({});
    (prisma.invoice.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      id: 'inv-1',
      encounterId,
      totalAmount: 0,
      payments: [
        {
          id: 'pay-1',
          amount: 100,
          method: 'CASH',
          receivedAt: new Date('2026-02-19T12:00:00Z'),
          reference: null,
        },
      ],
    });
    (prisma.invoice.update as jest.Mock).mockResolvedValue({});

    const dto: RecordPaymentDto = {
      amount: 100,
      method: 'CASH',
      reference: 'ref-123',
    };
    const result = await service.recordPayment(encounterId, dto);

    expect(result.invoice).toMatchObject({
      invoice_id: 'inv-1',
      encounter_id: encounterId,
      total_amount: 0,
      paid_amount: 100,
      status: 'PAID', // paid >= total
    });
    expect(result.payments).toHaveLength(1);
    expect(result.payments[0]).toMatchObject({
      id: 'pay-1',
      amount: 100,
      method: 'CASH',
    });
  });
});
