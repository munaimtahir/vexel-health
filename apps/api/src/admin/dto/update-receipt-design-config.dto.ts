import { IsBoolean, IsIn, IsString } from 'class-validator';

export class UpdateReceiptDesignConfigDto {
  @IsBoolean()
  showLogo: boolean;

  @IsString()
  businessNameOverride: string;

  @IsBoolean()
  showAddress: boolean;

  @IsBoolean()
  showContact: boolean;

  @IsBoolean()
  showQuantityColumn: boolean;

  @IsBoolean()
  showUnitPrice: boolean;

  @IsBoolean()
  showDiscountColumn: boolean;

  @IsBoolean()
  showTaxColumn: boolean;

  @IsBoolean()
  showSubtotal: boolean;

  @IsBoolean()
  showDiscount: boolean;

  @IsBoolean()
  showTax: boolean;

  @IsIn(['bold', 'accent'])
  grandTotalStyle: string;

  @IsString()
  thankYouMessage: string;

  @IsString()
  termsAndConditions: string;

  @IsBoolean()
  showQrCodePlaceholder: boolean;

  @IsIn(['a4', 'thermal80', 'thermal58'])
  receiptWidthMode: string;
}
