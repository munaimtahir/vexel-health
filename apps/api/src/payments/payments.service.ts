import { Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import type { RecordPaymentDto } from './dto/record-payment.dto';

export type InvoiceSummary = {
  invoice_id: string;
  encounter_id: string;
  total_amount: number;
  paid_amount: number;
  status: 'UNPAID' | 'PARTIAL' | 'PAID';
};

export type PaymentRecord = {
  id: string;
  amount: number;
  method: string;
  receivedAt: string;
  reference?: string;
};

export type RecordPaymentResponse = {
  invoice: InvoiceSummary;
  payments: PaymentRecord[];
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  private get tenantId(): string {
    const tenantId = this.cls.get<string>('TENANT_ID');
    if (typeof tenantId !== 'string' || tenantId.length === 0) {
      throw new Error('Tenant context missing');
    }
    return tenantId;
  }

  async recordPayment(
    encounterId: string,
    dto: RecordPaymentDto,
  ): Promise<RecordPaymentResponse> {
    const tenantId = this.tenantId;

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, tenantId },
      select: { id: true, patientId: true },
    });

    if (!encounter) {
      throw new NotFoundException('Encounter not found');
    }

    let invoice = await this.prisma.invoice.findFirst({
      where: { tenantId, encounterId },
      include: { payments: true },
    });

    if (!invoice) {
      invoice = await this.prisma.invoice.create({
        data: {
          tenantId,
          patientId: encounter.patientId,
          encounterId,
          status: 'UNPAID',
          totalAmount: new Decimal(0),
          currency: 'USD',
        },
        include: { payments: true },
      });
    }

    const amountDecimal = new Decimal(dto.amount);
    await this.prisma.payment.create({
      data: {
        tenantId,
        invoiceId: invoice.id,
        method: dto.method,
        amount: amountDecimal,
        reference: dto.reference ?? null,
      },
    });

    const updated = await this.prisma.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
      include: {
        payments: { orderBy: { receivedAt: 'asc' } },
      },
    });

    const totalAmount = Number(updated.totalAmount);
    const paidAmount = updated.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const status =
      paidAmount >= totalAmount
        ? 'PAID'
        : paidAmount > 0
          ? 'PARTIAL'
          : 'UNPAID';

    await this.prisma.invoice.update({
      where: { id: updated.id },
      data: { status },
    });

    return {
      invoice: {
        invoice_id: updated.id,
        encounter_id: updated.encounterId ?? encounterId,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        status,
      },
      payments: updated.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        receivedAt: p.receivedAt.toISOString(),
        reference: p.reference ?? undefined,
      })),
    };
  }
}
