import { IsOptional, IsString } from 'class-validator';

export class UpdateBrandingConfigDto {
  @IsString()
  businessName: string;

  @IsString()
  address: string;

  @IsString()
  phone: string;

  @IsString()
  headerLine1: string;

  @IsString()
  headerLine2: string;

  @IsOptional()
  @IsString()
  logoAssetName?: string;

  @IsOptional()
  @IsString()
  headerAssetName?: string;

  @IsOptional()
  @IsString()
  footerAssetName?: string;
}
