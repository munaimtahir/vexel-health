import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

const allowedGenders = ['male', 'female', 'other'] as const;

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  @IsOptional()
  dob?: string;

  @IsIn(allowedGenders)
  @IsOptional()
  gender?: (typeof allowedGenders)[number];

  @IsString()
  @IsOptional()
  phone?: string;
}
