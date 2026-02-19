import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export const PAYMENT_METHODS = ['CASH', 'CARD', 'ONLINE', 'OTHER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export class RecordPaymentDto {
  @IsNumber()
  @Min(0.01, { message: 'amount must be greater than 0' })
  amount!: number;

  @IsEnum(PAYMENT_METHODS)
  method!: PaymentMethod;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
