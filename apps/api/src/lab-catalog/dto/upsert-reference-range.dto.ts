import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class UpsertReferenceRangeDto {
  @IsUUID()
  parameterId: string;

  @IsOptional()
  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  sex?: 'MALE' | 'FEMALE' | 'OTHER';

  @IsOptional()
  @IsInt()
  @Min(0)
  ageMinDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ageMaxDays?: number;

  @IsOptional()
  @IsNumber()
  low?: number;

  @IsOptional()
  @IsNumber()
  high?: number;

  @IsOptional()
  @IsString()
  textRange?: string;
}
